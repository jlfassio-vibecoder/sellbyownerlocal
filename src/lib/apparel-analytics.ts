import { isPublicListingEvent } from './analytics-actor';
import { getActiveApparelForSeller } from './clothing-api';
import { db } from './firebase-admin';
import {
  buildPriceByClothingId,
  scoreSessionEngagement,
} from './lead-intent';
import {
  ApparelAnalyticsResponseSchema,
  type ApparelAnalyticsResponse,
  type ApparelEngagedBuyer,
  type ApparelFunnelStage,
  type ApparelJourney,
  type ApparelSkuAnalyticsRow,
  type ListingAnalyticsRange,
  type ListingEvent,
  type ListingEventType,
} from '../schemas';

const MAX_EVENTS = 10_000;
const PAGE_SIZE = 500;
const MAX_JOURNEYS = 15;
const MAX_STEPS_PER_JOURNEY = 20;
const MAX_ENGAGED_BUYERS = 10;

export function resolveAnalyticsSince(range: ListingAnalyticsRange): string | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);
  return since.toISOString();
}

export function safeConversionRate(quotes: number, pdpViews: number): number {
  if (pdpViews <= 0) return 0;
  return Math.min(100, Math.max(0, (quotes / pdpViews) * 100));
}

export function needsSkuOptimization(input: {
  pdpViews: number;
  favoriteAdds: number;
  quoteSubmits: number;
}): boolean {
  return (
    (input.pdpViews >= 5 || input.favoriteAdds >= 2) && input.quoteSubmits === 0
  );
}

export function buildFunnelStages(counts: {
  views: number;
  favorites: number;
  quoteOpen: number;
  quoteSubmit: number;
}): ApparelFunnelStage[] {
  const stages: Array<{ id: ApparelFunnelStage['id']; label: string; count: number }> = [
    { id: 'views', label: 'Storefront / PDP views', count: counts.views },
    { id: 'favorites', label: 'Favorites added', count: counts.favorites },
    { id: 'quote_open', label: 'Quote modal opened', count: counts.quoteOpen },
    { id: 'quote_submit', label: 'Quotes submitted', count: counts.quoteSubmit },
  ];

  return stages.map((stage, index) => {
    if (index === 0) {
      return { ...stage, dropOffPercent: null };
    }
    const previous = stages[index - 1].count;
    const dropOffPercent =
      previous <= 0 ? 0 : Math.max(0, ((previous - stage.count) / previous) * 100);
    return { ...stage, dropOffPercent };
  });
}

export function humanizeApparelEvent(
  event: ListingEvent,
  titleByClothingId: Map<string, string>
): string {
  switch (event.eventType) {
    case 'page_view':
      if (event.surface === 'apparel_storefront') return 'Viewed storefront';
      if (event.clothingId) {
        const title = titleByClothingId.get(event.clothingId);
        return title ? `Viewed ${title}` : 'Viewed item page';
      }
      return 'Viewed page';
    case 'impression':
      if (event.clothingId) {
        const title = titleByClothingId.get(event.clothingId);
        return title ? `Saw ${title} in grid` : 'Saw item in grid';
      }
      return 'Saw listing in grid';
    case 'favorite_add': {
      const title = event.clothingId
        ? titleByClothingId.get(event.clothingId)
        : undefined;
      return title ? `Favorited ${title}` : 'Favorited item';
    }
    case 'favorite_remove': {
      const title = event.clothingId
        ? titleByClothingId.get(event.clothingId)
        : undefined;
      return title ? `Unfavorited ${title}` : 'Unfavorited item';
    }
    case 'quote_open':
      return 'Opened quote modal';
    case 'quote_submit':
      return 'Submitted quote';
    default:
      return event.eventType;
  }
}

async function fetchSellerListingEvents(
  sellerId: string,
  since: string | null
): Promise<ListingEvent[]> {
  const events: ListingEvent[] = [];
  let query = db()
    .collection('listing_events')
    .where('sellerId', '==', sellerId)
    .orderBy('timestamp', 'asc')
    .limit(PAGE_SIZE);

  if (since) {
    query = db()
      .collection('listing_events')
      .where('sellerId', '==', sellerId)
      .where('timestamp', '>=', since)
      .orderBy('timestamp', 'asc')
      .limit(PAGE_SIZE);
  }

  while (events.length < MAX_EVENTS) {
    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      events.push({
        sessionId: data.sessionId,
        vehicleId: data.vehicleId,
        clothingId: data.clothingId,
        sellerId: data.sellerId,
        eventType: data.eventType,
        surface: data.surface ?? undefined,
        metadata: data.metadata ?? undefined,
        actor: data.actor ?? undefined,
        timestamp: data.timestamp,
      });
    }

    if (snapshot.size < PAGE_SIZE) break;

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    query = since
      ? db()
          .collection('listing_events')
          .where('sellerId', '==', sellerId)
          .where('timestamp', '>=', since)
          .orderBy('timestamp', 'asc')
          .startAfter(lastDoc)
          .limit(PAGE_SIZE)
      : db()
          .collection('listing_events')
          .where('sellerId', '==', sellerId)
          .orderBy('timestamp', 'asc')
          .startAfter(lastDoc)
          .limit(PAGE_SIZE);
  }

  return events.slice(0, MAX_EVENTS);
}

function sessionHadEventType(
  events: ListingEvent[],
  type: ListingEventType | ListingEventType[],
  predicate?: (event: ListingEvent) => boolean
): Set<string> {
  const types = Array.isArray(type) ? new Set(type) : new Set([type]);
  const sessions = new Set<string>();
  for (const event of events) {
    if (!types.has(event.eventType)) continue;
    if (predicate && !predicate(event)) continue;
    sessions.add(event.sessionId);
  }
  return sessions;
}

export async function getApparelSellerAnalytics(
  sellerId: string,
  range: ListingAnalyticsRange
): Promise<ApparelAnalyticsResponse> {
  const since = resolveAnalyticsSince(range);
  const until = new Date().toISOString();

  const [catalog, rawEvents] = await Promise.all([
    getActiveApparelForSeller(sellerId),
    fetchSellerListingEvents(sellerId, since),
  ]);

  const events = rawEvents.filter(isPublicListingEvent);
  const titleByClothingId = new Map(catalog.map((item) => [item.id, item.title]));

  const viewSessions = sessionHadEventType(events, 'page_view', (event) =>
    event.surface === 'apparel_storefront' ||
    event.surface === 'apparel_pdp' ||
    Boolean(event.clothingId)
  );
  const favoriteSessions = sessionHadEventType(events, 'favorite_add');
  const quoteOpenSessions = sessionHadEventType(events, 'quote_open');
  const quoteSubmitSessions = sessionHadEventType(events, 'quote_submit');

  const funnel = buildFunnelStages({
    views: viewSessions.size,
    favorites: favoriteSessions.size,
    quoteOpen: quoteOpenSessions.size,
    quoteSubmit: quoteSubmitSessions.size,
  });

  const skuStats = new Map<
    string,
    { impressions: number; pdpViews: number; favoriteAdds: number; quoteSubmits: number }
  >();

  for (const item of catalog) {
    skuStats.set(item.id, {
      impressions: 0,
      pdpViews: 0,
      favoriteAdds: 0,
      quoteSubmits: 0,
    });
  }

  for (const event of events) {
    if (event.eventType === 'impression' && event.clothingId) {
      const stats = skuStats.get(event.clothingId);
      if (stats) stats.impressions += 1;
    }
    if (
      event.eventType === 'page_view' &&
      event.clothingId &&
      (event.surface === 'apparel_pdp' || !event.surface)
    ) {
      const stats = skuStats.get(event.clothingId);
      if (stats) stats.pdpViews += 1;
    }
    if (event.eventType === 'favorite_add' && event.clothingId) {
      const stats = skuStats.get(event.clothingId);
      if (stats) stats.favoriteAdds += 1;
    }
    if (event.eventType === 'quote_submit') {
      const ids =
        event.metadata?.clothingIds?.length
          ? event.metadata.clothingIds
          : event.clothingId
            ? [event.clothingId]
            : [];
      for (const clothingId of ids) {
        const stats = skuStats.get(clothingId);
        if (stats) stats.quoteSubmits += 1;
      }
    }
  }

  const skus: ApparelSkuAnalyticsRow[] = catalog
    .map((item) => {
      const stats = skuStats.get(item.id)!;
      const conversionRate = safeConversionRate(stats.quoteSubmits, stats.pdpViews);
      return {
        clothingId: item.id,
        title: item.title,
        imageUrl: item.galleryPhotos[0],
        impressions: stats.impressions,
        pdpViews: stats.pdpViews,
        favoriteAdds: stats.favoriteAdds,
        quoteSubmits: stats.quoteSubmits,
        conversionRate,
        needsOptimization: needsSkuOptimization(stats),
      };
    })
    .sort((a, b) => {
      if (b.quoteSubmits !== a.quoteSubmits) return b.quoteSubmits - a.quoteSubmits;
      if (b.pdpViews !== a.pdpViews) return b.pdpViews - a.pdpViews;
      return b.impressions - a.impressions;
    });

  const bySession = new Map<string, ListingEvent[]>();
  for (const event of events) {
    if (!bySession.has(event.sessionId)) {
      bySession.set(event.sessionId, []);
    }
    bySession.get(event.sessionId)!.push(event);
  }

  const priceByClothingId = buildPriceByClothingId(catalog);
  const topEngagedBuyers: ApparelEngagedBuyer[] = [...bySession.entries()]
    .map(([sessionId, sessionEvents]) => {
      const engagement = scoreSessionEngagement(sessionEvents, priceByClothingId);
      return {
        sessionId,
        sessionShortId: sessionId.slice(0, 8),
        visitDays: engagement.visitDays,
        favoriteCount: engagement.favoriteCount,
        intentScore: engagement.score,
        intentTier: engagement.tier,
        lastSeenAt: engagement.lastSeenAt,
      };
    })
    .filter((buyer) => buyer.intentScore > 0 || buyer.visitDays > 0 || buyer.favoriteCount > 0)
    .sort((a, b) => {
      if (b.intentScore !== a.intentScore) return b.intentScore - a.intentScore;
      return b.lastSeenAt.localeCompare(a.lastSeenAt);
    })
    .slice(0, MAX_ENGAGED_BUYERS);

  const journeys: ApparelJourney[] = [...bySession.entries()]
    .map(([sessionId, sessionEvents]) => {
      const ordered = [...sessionEvents].sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp)
      );
      const lastSeenAt = ordered[ordered.length - 1]?.timestamp ?? until;
      const steps = ordered.slice(0, MAX_STEPS_PER_JOURNEY).map((event) => ({
        label: humanizeApparelEvent(event, titleByClothingId),
        eventType: event.eventType,
        timestamp: event.timestamp,
      }));
      return {
        sessionId,
        sessionShortId: sessionId.slice(0, 8),
        lastSeenAt,
        steps,
      };
    })
    .filter((journey) => journey.steps.length > 0)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
    .slice(0, MAX_JOURNEYS);

  return ApparelAnalyticsResponseSchema.parse({
    sellerId,
    range,
    since: since ?? events[0]?.timestamp ?? until,
    until,
    funnel,
    skus,
    topEngagedBuyers,
    journeys,
  });
}
