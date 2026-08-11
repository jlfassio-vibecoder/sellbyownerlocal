import type { APIRoute } from 'astro';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../../lib/auth';
import { db } from '../../../../lib/firebase-admin';
import {
  assertListingStatusTransition,
  InvalidListingStatusTransitionError,
  parseListingLifecycleStatus,
} from '../../../../lib/listing-lifecycle';
import { ClothingListingStatusSchema } from '../../../../schemas';

const BulkUpdateUpdatesSchema = z
  .object({
    status: ClothingListingStatusSchema.optional(),
    isFeatured: z.boolean().optional(),
    isSale: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required in updates',
  });

const BulkUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  updates: BulkUpdateUpdatesSchema,
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireSeller(request, cookies);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = BulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const uniqueIds = [...new Set(parsed.data.ids)];
    const refs = uniqueIds.map((id) => db().collection('clothing_listings').doc(id));
    const docs = await Promise.all(refs.map((ref) => ref.get()));
    const batch = db().batch();
    let updatedCount = 0;
    const toStatus = parsed.data.updates.status;
    const statusChangedAt = new Date().toISOString();

    for (let i = 0; i < uniqueIds.length; i++) {
      const doc = docs[i];
      const ref = refs[i];

      if (!doc.exists) {
        return new Response(JSON.stringify({ error: 'Listing not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const existing = doc.data() ?? {};
      const existingSellerId = existing.sellerId;
      if (existingSellerId !== session.uid) {
        return forbiddenResponse();
      }

      const firestoreUpdates: Record<string, unknown> = { ...parsed.data.updates };
      if (parsed.data.updates.isSale === false) {
        firestoreUpdates.salePrice = FieldValue.delete();
      }

      if (toStatus !== undefined) {
        const fromStatus = parseListingLifecycleStatus(existing.status);
        if (!fromStatus) {
          return new Response(JSON.stringify({ error: 'Listing has invalid status' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        assertListingStatusTransition(fromStatus, toStatus);
        firestoreUpdates.previousStatus = fromStatus;
        firestoreUpdates.statusChangedAt = statusChangedAt;
      }

      batch.update(ref, firestoreUpdates);
      updatedCount += 1;
    }

    await batch.commit();

    return new Response(JSON.stringify({ success: true, updatedCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof InvalidListingStatusTransitionError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid status transition',
          from: error.from,
          to: error.to,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse();
    }
    console.error('POST /api/seller/apparel/bulk-update failed', error);
    return new Response(JSON.stringify({ error: 'Failed to update listings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
