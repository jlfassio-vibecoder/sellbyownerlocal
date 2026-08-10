import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getUserProfile } from '../../lib/buyer-profile';
import { buildSellerScopedLeadMessage } from '../../lib/contact-message';
import { db } from '../../lib/firebase-admin';
import {
  assertSellerOwnsItem,
  enrichFavoriteFromClothingData,
  enrichFavoriteFromGenericListingData,
  enrichFavoriteFromVehicleData,
  type LeadItemResolveResult,
} from '../../lib/lead-items';
import { sendLeadNotification } from '../../lib/notifications';
import { checkRateLimit, getClientIp } from '../../lib/rate-limit';
import { LeadCreateResponseSchema, LeadCreateSchema, type FavoriteItem } from '../../schemas';
import { resolveStorefrontSegment } from '../../utils/url-helpers';

const LEAD_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 5,
};

const LISTING_COLLECTIONS = ['listings', 'clothing_listings', 'vehicles'] as const;

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function resolveActiveEnrichedItem(
  itemId: string,
  expectedSellerId: string,
  storefrontSegment: string
): Promise<LeadItemResolveResult> {
  for (const collection of LISTING_COLLECTIONS) {
    const snapshot = await db().collection(collection).doc(itemId).get();
    if (!snapshot.exists) continue;

    const data = (snapshot.data() ?? {}) as Record<string, unknown>;
    let enriched: FavoriteItem | null = null;

    if (collection === 'clothing_listings') {
      enriched = enrichFavoriteFromClothingData(itemId, data, storefrontSegment);
    } else if (collection === 'vehicles') {
      enriched = enrichFavoriteFromVehicleData(itemId, data);
    } else {
      enriched = enrichFavoriteFromGenericListingData(itemId, data, storefrontSegment);
    }

    if (!enriched) {
      return { ok: false, failure: { kind: 'not_found_or_inactive' } };
    }

    return assertSellerOwnsItem(enriched, expectedSellerId);
  }

  return { ok: false, failure: { kind: 'not_found_or_inactive' } };
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const clientIp = getClientIp(request, clientAddress);
  const rateLimit = checkRateLimit(`leads:${clientIp}`, LEAD_RATE_LIMIT);

  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil((rateLimit.retryAfterMs ?? LEAD_RATE_LIMIT.windowMs) / 1000);
    return new Response(JSON.stringify({ error: 'Too many submissions. Please try again later.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
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

  const parsed = LeadCreateSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: 'Validation failed',
        details: z.flattenError(parsed.error).fieldErrors,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { sellerId, name, email, phone, message, items } = parsed.data;
    const leadItems = items ?? [];

    if (leadItems.length === 0) {
      return jsonResponse({ error: 'At least one saved item is required to submit a lead.' }, 400);
    }

    const sellerProfile = await getUserProfile(sellerId);
    const storefrontSegment = resolveStorefrontSegment({
      id: sellerId,
      storefrontSlug: sellerProfile?.storefrontSlug,
    });

    const enrichedItems: FavoriteItem[] = [];

    for (const item of leadItems) {
      const resolved = await resolveActiveEnrichedItem(item.id, sellerId, storefrontSegment);

      if (!resolved.ok) {
        if (resolved.failure.kind === 'seller_mismatch') {
          return jsonResponse({ error: 'Seller does not match the referenced listing.' }, 403);
        }
        return jsonResponse(
          { error: 'Referenced listing not found or is not active.' },
          400
        );
      }

      enrichedItems.push(resolved.item);
    }

    const createdAt = new Date().toISOString();
    const scopedMessage = buildSellerScopedLeadMessage(message, enrichedItems, name);

    const docRef = await db().collection('leads').add({
      sellerId,
      name,
      email,
      phone,
      message: scopedMessage,
      items: enrichedItems,
      createdAt,
    });

    try {
      await sendLeadNotification({
        sellerId,
        leadId: docRef.id,
        buyerInfo: { name, email, phone },
        items: enrichedItems.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          category: item.category,
        })),
        message: scopedMessage,
      });
    } catch (notifyError) {
      console.error('sendLeadNotification failed', notifyError);
    }

    const response = LeadCreateResponseSchema.parse({ ok: true, id: docRef.id });
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('POST /api/leads failed', error);
    return new Response(JSON.stringify({ error: 'Failed to submit lead' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
