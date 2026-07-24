import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  createSessionCookie,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  unauthorizedResponse,
} from '../../../lib/auth';
import { provisionUserProfile } from '../../../lib/buyer-profile';
import { auth } from '../../../lib/firebase-admin';
import type { VerificationTier } from '../../../schemas';

const SessionBodySchema = z.object({
  idToken: z.string().min(1),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return unauthorizedResponse('Invalid JSON body');
  }

  const parsed = SessionBodySchema.safeParse(body);
  if (!parsed.success) {
    return unauthorizedResponse('Invalid request body');
  }

  try {
    const decoded = await auth().verifyIdToken(parsed.data.idToken);

    // Profile provisioning hits Firestore; do not block login if quota/profile fails.
    let verificationTier: VerificationTier = 'anonymous';
    try {
      verificationTier = await provisionUserProfile(decoded.uid, {
        displayName: decoded.name,
        email: decoded.email,
      });
    } catch (profileError) {
      console.error(
        'POST /api/auth/session: provisionUserProfile failed; continuing with session cookie',
        profileError
      );
    }

    const sessionCookie = await createSessionCookie(parsed.data.idToken);
    cookies.set(SESSION_COOKIE_NAME, sessionCookie, getSessionCookieOptions());

    return new Response(JSON.stringify({ success: true, verificationTier }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error('POST /api/auth/session failed', error);
    return unauthorizedResponse('Invalid or expired token');
  }
};
