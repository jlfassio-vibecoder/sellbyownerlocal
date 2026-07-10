import type { APIRoute } from 'astro';
import { z } from 'zod';
import { db } from '../../lib/firebase-admin';
import { checkRateLimit, getClientIp } from '../../lib/rate-limit';
import { LeadCreateResponseSchema, LeadCreateSchema } from '../../schemas';

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

async function resolveListingSellerId(itemId: string): Promise<string | null> {
  for (const collection of LISTING_COLLECTIONS) {
    const snapshot = await db().collection(collection).doc(itemId).get();
    if (!snapshot.exists) continue;

    const data = snapshot.data() as Record<string, unknown> | undefined;
    const sellerId = data?.sellerId;
    return typeof sellerId === 'string' && sellerId.trim() ? sellerId.trim() : null;
  }

  return null;
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
    const firstItem = leadItems[0];

    if (!firstItem?.id) {
      return jsonResponse({ error: 'At least one saved item is required to submit a lead.' }, 400);
    }

    const listingSellerId = await resolveListingSellerId(firstItem.id);

    if (!listingSellerId) {
      return jsonResponse({ error: 'Referenced listing not found.' }, 400);
    }

    if (listingSellerId !== sellerId) {
      return jsonResponse({ error: 'Seller does not match the referenced listing.' }, 403);
    }

    const createdAt = new Date().toISOString();

    const docRef = await db().collection('leads').add({
      sellerId,
      name,
      email,
      phone,
      message,
      items: leadItems,
      createdAt,
    });

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
