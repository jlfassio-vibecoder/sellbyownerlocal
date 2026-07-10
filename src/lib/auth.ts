import type { AstroCookies } from 'astro';
import { auth } from './firebase-admin';
import { meetsVerificationTier } from './verification';
import { resolveVerificationTier } from './buyer-profile';
import type { VerificationTier } from '../schemas';

export interface UserSession {
  uid: string;
  email?: string;
  isDealer: boolean;
  verificationTier: VerificationTier;
}

/** @deprecated Use UserSession — kept for backward compatibility */
export type SellerSession = UserSession;

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

export class VerificationRequiredError extends ForbiddenError {
  readonly code = 'VERIFICATION_REQUIRED' as const;
  readonly requiredTier: VerificationTier;
  readonly currentTier: VerificationTier;

  constructor(requiredTier: VerificationTier, currentTier: VerificationTier) {
    super('Verification required');
    this.name = 'VerificationRequiredError';
    this.requiredTier = requiredTier;
    this.currentTier = currentTier;
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

interface DecodedTokenBase {
  uid: string;
  email?: string;
  isDealer: boolean;
}

async function decodeToken(token: string): Promise<DecodedTokenBase> {
  try {
    const decoded = await auth().verifySessionCookie(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      isDealer: decoded.dealer === true,
    };
  } catch {
    try {
      const decoded = await auth().verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email,
        isDealer: decoded.dealer === true,
      };
    } catch {
      throw new AuthError('Invalid or expired token');
    }
  }
}

export async function enrichSession(base: DecodedTokenBase): Promise<UserSession> {
  const verificationTier = await resolveVerificationTier(base.uid);
  return {
    uid: base.uid,
    email: base.email,
    isDealer: base.isDealer,
    verificationTier,
  };
}

export async function verifySellerToken(token: string): Promise<UserSession> {
  return enrichSession(await decodeToken(token));
}

export async function getSession(
  request: Request,
  cookies: AstroCookies
): Promise<UserSession> {
  const token = extractToken(request, cookies);
  if (!token) {
    throw new AuthError();
  }
  return verifySellerToken(token);
}

export async function getOptionalSession(
  request: Request,
  cookies: AstroCookies
): Promise<UserSession | null> {
  const token = extractToken(request, cookies);
  if (!token) return null;

  try {
    return await verifySellerToken(token);
  } catch {
    return null;
  }
}

export async function requireSeller(
  request: Request,
  cookies: AstroCookies
): Promise<UserSession> {
  return getSession(request, cookies);
}

/** Alias for requireSeller — any authenticated user (buyer or seller). */
export async function requireAuthenticated(
  request: Request,
  cookies: AstroCookies
): Promise<UserSession> {
  return getSession(request, cookies);
}

export async function getOptionalSellerSession(
  request: Request,
  cookies: AstroCookies
): Promise<UserSession | null> {
  return getOptionalSession(request, cookies);
}

export function requireVerificationTier(
  session: UserSession,
  requiredTier: VerificationTier
): void {
  if (!meetsVerificationTier(session.verificationTier, requiredTier)) {
    throw new VerificationRequiredError(requiredTier, session.verificationTier);
  }
}

export async function requireDealer(
  request: Request,
  cookies: AstroCookies
): Promise<UserSession> {
  const session = await requireSeller(request, cookies);
  if (!session.isDealer) {
    throw new ForbiddenError('Dealer access required');
  }
  return session;
}

function buildLoginRedirectPath(request: Request, loginPath?: string): string {
  const url = new URL(request.url);
  const next = url.pathname + url.search;
  const destination = new URL(loginPath ?? '/login', url.origin);
  destination.searchParams.set('next', next);
  return destination.pathname + destination.search;
}

export async function requireDealerOrRedirect(
  request: Request,
  cookies: AstroCookies,
  loginPath?: string
): Promise<UserSession | Response> {
  try {
    return await requireDealer(request, cookies);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return forbiddenResponse('Dealer access required');
    }
    const destination = buildLoginRedirectPath(request, loginPath);
    return Response.redirect(new URL(destination, request.url), 302);
  }
}

export async function requireSellerOrRedirect(
  request: Request,
  cookies: AstroCookies,
  loginPath?: string
): Promise<UserSession | Response> {
  try {
    return await requireSeller(request, cookies);
  } catch {
    const destination = buildLoginRedirectPath(request, loginPath);
    return Response.redirect(new URL(destination, request.url), 302);
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

export function verificationRequiredResponse(error: VerificationRequiredError): Response {
  return new Response(
    JSON.stringify({
      error: error.message,
      code: error.code,
      requiredTier: error.requiredTier,
      currentTier: error.currentTier,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
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
