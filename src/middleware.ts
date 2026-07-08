import { defineMiddleware } from 'astro:middleware';
import {
  ANON_SESSION_COOKIE_NAME,
  createAnonSessionId,
  getAnonSessionCookieOptions,
} from './lib/analytics-session';

export const onRequest = defineMiddleware((context, next) => {
  const existing = context.cookies.get(ANON_SESSION_COOKIE_NAME)?.value;
  if (!existing) {
    context.cookies.set(
      ANON_SESSION_COOKIE_NAME,
      createAnonSessionId(),
      getAnonSessionCookieOptions()
    );
  }

  return next();
});
