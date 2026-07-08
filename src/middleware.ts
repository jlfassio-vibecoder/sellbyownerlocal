import { defineMiddleware } from 'astro:middleware';
import {
  ANON_SESSION_COOKIE_NAME,
  createAnonSessionId,
  getAnonSessionCookieOptions,
} from './lib/analytics-session';

function shouldSetAnonSession(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/vehicles/') ||
    pathname === '/api/analytics/events'
  );
}

export const onRequest = defineMiddleware((context, next) => {
  const pathname = context.url.pathname;
  if (shouldSetAnonSession(pathname)) {
    const existing = context.cookies.get(ANON_SESSION_COOKIE_NAME)?.value;
    if (!existing) {
      context.cookies.set(
        ANON_SESSION_COOKIE_NAME,
        createAnonSessionId(),
        getAnonSessionCookieOptions()
      );
    }
  }

  return next();
});
