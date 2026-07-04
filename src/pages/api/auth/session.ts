import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  createSessionCookie,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  unauthorizedResponse,
} from '../../../lib/auth';
import { auth } from '../../../lib/firebase-admin';

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
    await auth().verifyIdToken(parsed.data.idToken);
    const sessionCookie = await createSessionCookie(parsed.data.idToken);

    cookies.set(SESSION_COOKIE_NAME, sessionCookie, getSessionCookieOptions());

    return new Response(JSON.stringify({ success: true }), {
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
