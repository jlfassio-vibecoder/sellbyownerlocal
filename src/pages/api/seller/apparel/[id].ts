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
import { ClothingListingUpdateSchema } from '../../../../schemas';

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  const listingId = params.id?.trim();

  if (!listingId) {
    return new Response(JSON.stringify({ error: 'Listing not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const session = await requireSeller(request, cookies);

    const ref = db().collection('clothing_listings').doc(listingId);
    const doc = await ref.get();

    if (!doc.exists) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existingSellerId = doc.data()?.sellerId;
    if (existingSellerId !== session.uid) {
      return forbiddenResponse();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = ClothingListingUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await ref.update(parsed.data);

    return new Response(JSON.stringify({ success: true }), {
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
    console.error(`PATCH /api/seller/apparel/${listingId} failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to update listing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
