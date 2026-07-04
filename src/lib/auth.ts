import type { AstroCookies } from 'astro';
import { auth } from './firebase-admin';

export interface SellerSession {
  uid: string;
  email?: string;
}

export const SESSION_COOKIE_NAME = '__session';
const SESSION_EXPIRY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export class AuthError extends Error {
  readonly status = 401;

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;

  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function extractToken(request: Request, cookies: AstroCookies): string | null {
  const sessionCookie = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) return sessionCookie;

  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }

  return null;
}

export async function verifySellerToken(token: string): Promise<SellerSession> {
  try {
    const decoded = await auth().verifySessionCookie(token, true);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    try {
      const decoded = await auth().verifyIdToken(token);
      return { uid: decoded.uid, email: decoded.email };
    } catch {
      throw new AuthError('Invalid or expired token');
    }
  }
}

export async function requireSeller(
  request: Request,
  cookies: AstroCookies
): Promise<SellerSession> {
  const token = extractToken(request, cookies);
  if (!token) {
    throw new AuthError();
  }
  return verifySellerToken(token);
}

export async function requireSellerOrRedirect(
  request: Request,
  cookies: AstroCookies,
  loginPath = '/login'
): Promise<SellerSession | Response> {
  try {
    return await requireSeller(request, cookies);
  } catch {
    return Response.redirect(new URL(loginPath, request.url), 302);
  }
}

export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function forbiddenResponse(message = 'Forbidden'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function assertVehicleOwner(uid: string, vehicleSellerId: string): void {
  if (uid !== vehicleSellerId) {
    throw new ForbiddenError();
  }
}

export async function createSessionCookie(idToken: string): Promise<string> {
  return auth().createSessionCookie(idToken, { expiresIn: SESSION_EXPIRY_MS });
}

export function getSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_EXPIRY_MS / 1000),
  };
}

export function getClearSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };
}
