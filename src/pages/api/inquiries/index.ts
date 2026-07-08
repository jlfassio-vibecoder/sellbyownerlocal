import type { APIRoute } from 'astro';
import {
  AuthError,
  requireSeller,
  requireVerificationTier,
  unauthorizedResponse,
  verificationRequiredResponse,
  VerificationRequiredError,
} from '../../../lib/auth';
import { db } from '../../../lib/firebase-admin';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { InquirySchema } from '../../../schemas';

const INQUIRY_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 5,
};

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const session = await requireSeller(request, cookies);
    requireVerificationTier(session, 'phone_verified');

    const clientIp = getClientIp(request, clientAddress);
    const rateLimit = checkRateLimit(`inquiries:${clientIp}`, INQUIRY_RATE_LIMIT);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimit.retryAfterMs ?? INQUIRY_RATE_LIMIT.windowMs) / 1000);
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

    const parsed = InquirySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { vehicleId, sellerId, name, phone, email, message } = parsed.data;

    const vehicleDoc = await db().collection('vehicles').doc(vehicleId).get();

    if (!vehicleDoc.exists) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const vehicleData = vehicleDoc.data();
    if (vehicleData?.sellerId !== sellerId) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db().collection('inquiries').add({
      vehicleId,
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
    console.error('POST /api/inquiries failed', error);
    return new Response(JSON.stringify({ error: 'Failed to submit inquiry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
