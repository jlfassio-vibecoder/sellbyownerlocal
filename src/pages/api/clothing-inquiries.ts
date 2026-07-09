import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  requireSeller,
  requireVerificationTier,
  unauthorizedResponse,
  verificationRequiredResponse,
  VerificationRequiredError,
} from '../../lib/auth';
import { db } from '../../lib/firebase-admin';
import { checkRateLimit, getClientIp } from '../../lib/rate-limit';
import { ClothingInquirySchema } from '../../schemas';

const INQUIRY_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 5,
};

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const session = await requireSeller(request, cookies);
    requireVerificationTier(session, 'phone_verified');

    const clientIp = getClientIp(request, clientAddress);
    const rateLimit = checkRateLimit(`clothing-inquiries:${clientIp}`, INQUIRY_RATE_LIMIT);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil(
        (rateLimit.retryAfterMs ?? INQUIRY_RATE_LIMIT.windowMs) / 1000
      );
      return new Response(
        JSON.stringify({ error: 'Too many inquiries. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSeconds),
          },
        }
      );
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

    const parsed = ClothingInquirySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { clothingListingId, sellerId, name, phone, email, message } = parsed.data;

    const listingDoc = await db().collection('clothing_listings').doc(clothingListingId).get();

    if (!listingDoc.exists) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const listingData = listingDoc.data();
    if (listingData?.sellerId !== sellerId || listingData?.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db().collection('clothing_inquiries').add({
      clothingListingId,
      sellerId,
      name,
      phone,
      email,
      message: message || '',
      buyerUid: session.uid,
      verificationTier: session.verificationTier,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof VerificationRequiredError) {
      return verificationRequiredResponse(error);
    }
    console.error('POST /api/clothing-inquiries failed', error);
    return new Response(JSON.stringify({ error: 'Failed to submit inquiry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
