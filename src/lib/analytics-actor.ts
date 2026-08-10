import { isInternalAnalyticsEmail } from './analytics-exclusions';
import type { ListingEvent, ListingEventActor } from '../schemas';

export type AnalyticsActorSession = {
  uid: string;
  email?: string;
} | null;

/** Resolve actor kind + isInternal for a listing/storefront event. */
export function resolveListingEventActor(
  session: AnalyticsActorSession,
  sellerId: string
): ListingEventActor {
  if (!session) {
    return { kind: 'anon', isInternal: false };
  }

  if (isInternalAnalyticsEmail(session.email)) {
    return { kind: 'admin', uid: session.uid, isInternal: true };
  }

  if (session.uid === sellerId) {
    return { kind: 'seller', uid: session.uid, isInternal: true };
  }

  return { kind: 'user', uid: session.uid, isInternal: false };
}

/** Legacy events without actor remain included in public aggregates. */
export function isPublicListingEvent(
  event: Pick<ListingEvent, 'actor'> | { actor?: ListingEventActor | null }
): boolean {
  return event.actor?.isInternal !== true;
}
