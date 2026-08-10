import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../../../lib/auth';
import { mapClothingDoc } from '../../../../../lib/clothing-api';
import { db } from '../../../../../lib/firebase-admin';
import {
  assertListingStatusTransition,
  InvalidListingStatusTransitionError,
  parseListingLifecycleStatus,
} from '../../../../../lib/listing-lifecycle';
import { ListingStatusUpdateSchema } from '../../../../../schemas';

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

    const existing = doc.data() ?? {};
    if (existing.sellerId !== session.uid) {
      return forbiddenResponse();
    }

    const mapped = mapClothingDoc(doc.id, existing as Record<string, unknown>);
    if (!mapped.success) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
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

    const parsed = ListingStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fromStatus = parseListingLifecycleStatus(mapped.data.status);
    if (!fromStatus) {
      return new Response(JSON.stringify({ error: 'Listing has invalid status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const toStatus = parsed.data.status;
    assertListingStatusTransition(fromStatus, toStatus);

    const statusChangedAt = new Date().toISOString();
    await ref.update({
      status: toStatus,
      previousStatus: fromStatus,
      statusChangedAt,
    });

    return new Response(
      JSON.stringify({
        success: true,
        listing: { ...mapped.data, status: toStatus },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
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
    console.error(`PATCH /api/seller/apparel/${listingId}/status failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to update listing status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
