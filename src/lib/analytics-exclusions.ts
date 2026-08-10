/** Emails whose authenticated traffic is stamped isInternal and excluded from Insights. */
export const INTERNAL_ANALYTICS_EMAILS = new Set(['office@justinfassio.com']);

export function isInternalAnalyticsEmail(email?: string | null): boolean {
  if (!email) return false;
  return INTERNAL_ANALYTICS_EMAILS.has(email.trim().toLowerCase());
}
