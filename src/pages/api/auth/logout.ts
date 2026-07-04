import type { APIRoute } from 'astro';
import { getClearSessionCookieOptions, SESSION_COOKIE_NAME } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies }) => {
  cookies.set(SESSION_COOKIE_NAME, '', getClearSessionCookieOptions());

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
