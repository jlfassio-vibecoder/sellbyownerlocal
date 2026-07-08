import type { AstroCookies } from 'astro';

export const ANON_SESSION_COOKIE_NAME = 'anon_session';

const ANON_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export function getAnonSessionCookieOptions(): {
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
    maxAge: ANON_SESSION_MAX_AGE_SECONDS,
  };
}

export function getAnonSessionId(cookies: AstroCookies): string | null {
  return cookies.get(ANON_SESSION_COOKIE_NAME)?.value ?? null;
}

export function createAnonSessionId(): string {
  return crypto.randomUUID();
}

export function getOrCreateAnonSession(cookies: AstroCookies): string {
  const existing = getAnonSessionId(cookies);
  if (existing) return existing;

  const sessionId = createAnonSessionId();
  cookies.set(ANON_SESSION_COOKIE_NAME, sessionId, getAnonSessionCookieOptions());
  return sessionId;
}
