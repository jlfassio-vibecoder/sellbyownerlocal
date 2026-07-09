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

const BulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
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

    const parsed = BulkDeleteSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const batch = db().batch();
    let deletedCount = 0;

    for (const id of parsed.data.ids) {
      const ref = db().collection('clothing_listings').doc(id);
      const doc = await ref.get();

      if (!doc.exists) {
        continue;
      }

      const existingSellerId = doc.data()?.sellerId;
      if (existingSellerId !== session.uid) {
        return forbiddenResponse();
      }

      batch.delete(ref);
      deletedCount += 1;
    }

    if (deletedCount > 0) {
      await batch.commit();
    }

    return new Response(JSON.stringify({ success: true, deletedCount }), {
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
    console.error('POST /api/seller/apparel/bulk-delete failed', error);
    return new Response(JSON.stringify({ error: 'Failed to delete listings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
