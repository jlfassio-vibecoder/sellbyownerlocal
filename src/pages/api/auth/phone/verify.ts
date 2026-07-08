import type { APIRoute } from 'astro';
import {
  AuthError,
  requireSeller,
  unauthorizedResponse,
  verificationRequiredResponse,
  VerificationRequiredError,
} from '../../../../lib/auth';
import { upgradeToPhoneVerified } from '../../../../lib/buyer-profile';
import { auth } from '../../../../lib/firebase-admin';
import { PhoneVerifyRequestSchema } from '../../../../schemas';

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

    const parsed = PhoneVerifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const decoded = await auth().verifyIdToken(parsed.data.idToken);

    if (decoded.uid !== session.uid) {
      return unauthorizedResponse('Token does not match session');
    }

    const phoneNumber = decoded.phone_number;
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number not verified on token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const verificationTier = await upgradeToPhoneVerified(session.uid, phoneNumber);

    return new Response(JSON.stringify({ success: true, verificationTier }), {
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
    console.error('POST /api/auth/phone/verify failed', error);
    return new Response(JSON.stringify({ error: 'Failed to verify phone' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
