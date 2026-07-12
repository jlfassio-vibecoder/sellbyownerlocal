import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../../lib/auth';
import { db } from '../../../../lib/firebase-admin';

const ReorderItemSchema = z
  .object({
    id: z.string().min(1),
    sortOrder: z.number().int().nonnegative().optional(),
    featuredSortOrder: z.number().int().nonnegative().optional(),
  })
  .refine((value) => value.sortOrder !== undefined || value.featuredSortOrder !== undefined, {
    message: 'At least one of sortOrder or featuredSortOrder is required',
  });

const ReorderSchema = z.object({
  items: z.array(ReorderItemSchema).min(1).max(500),
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

    const parsed = ReorderSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { items } = parsed.data;
    const refs = items.map((item) => db().collection('clothing_listings').doc(item.id));
    const docs = await Promise.all(refs.map((ref) => ref.get()));
    const batch = db().batch();
    let updatedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const doc = docs[i]!;
      const ref = refs[i]!;

      if (!doc.exists) {
        return new Response(JSON.stringify({ error: 'Listing not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (doc.data()?.sellerId !== session.uid) {
        return forbiddenResponse();
      }

      const updates: Record<string, number> = {};
      if (item.sortOrder !== undefined) {
        updates.sortOrder = item.sortOrder;
      }
      if (item.featuredSortOrder !== undefined) {
        updates.featuredSortOrder = item.featuredSortOrder;
      }

      batch.update(ref, updates);
      updatedCount += 1;
    }

    await batch.commit();

    return new Response(JSON.stringify({ success: true, updatedCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse();
    }
    console.error('POST /api/seller/apparel/reorder failed', error);
    return new Response(JSON.stringify({ error: 'Failed to reorder listings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
