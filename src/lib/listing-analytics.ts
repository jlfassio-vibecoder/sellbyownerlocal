import { db } from './firebase-admin';
import {
  ListingAnalyticsResponseSchema,
  type ListingAnalyticsRange,
  type ListingAnalyticsResponse,
  type ListingEvent,
} from '../schemas';

const MAX_EVENTS = 10_000;
const PAGE_SIZE = 500;

const SECTION_LABELS: Record<string, string> = {
  overview: 'Overview',
  walkaround: 'Walkaround',
  pitch: "Seller's Note",
  gallery: 'Gallery',
  maintenance: 'Maintenance',
  market: 'Market Value',
  features: 'Utility',
  specs: 'Specifications',
  contact: 'Contact',
  'build-sheet': 'Build Sheet',
  carfax: 'Carfax',
  kbb: 'KBB Report',
  smog: 'Smog Report',
};

function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (denominator === 0) return fallback;
  return numerator / denominator;
}

function resolveSince(range: ListingAnalyticsRange): string | null {
  if (range === 'all') return null;

  const days = range === '7d' ? 7 : 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);
  return since.toISOString();
}

function utcDateKey(timestamp: string): string {
  return timestamp.slice(0, 10);
}

async function fetchListingEvents(vehicleId: string, since: string | null): Promise<ListingEvent[]> {
  const events: ListingEvent[] = [];
  let query = db()
    .collection('listing_events')
    .where('vehicleId', '==', vehicleId)
    .orderBy('timestamp', 'asc')
    .limit(PAGE_SIZE);

  if (since) {
    query = db()
      .collection('listing_events')
      .where('vehicleId', '==', vehicleId)
      .where('timestamp', '>=', since)
      .orderBy('timestamp', 'asc')
      .limit(PAGE_SIZE);
  }

  // Cap at 10_000 events per aggregation to bound memory and query cost.
  while (events.length < MAX_EVENTS) {
    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      events.push({
        sessionId: data.sessionId,
        vehicleId: data.vehicleId,
        eventType: data.eventType,
        metadata: data.metadata ?? undefined,
        timestamp: data.timestamp,
      });
    }

    if (snapshot.size < PAGE_SIZE) break;

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    query = since
      ? db()
          .collection('listing_events')
          .where('vehicleId', '==', vehicleId)
          .where('timestamp', '>=', since)
          .orderBy('timestamp', 'asc')
          .startAfter(lastDoc)
          .limit(PAGE_SIZE)
      : db()
          .collection('listing_events')
          .where('vehicleId', '==', vehicleId)
          .orderBy('timestamp', 'asc')
          .startAfter(lastDoc)
          .limit(PAGE_SIZE);
  }

  return events.slice(0, MAX_EVENTS);
}

async function countActiveSaves(vehicleId: string, since: string | null): Promise<number> {
  let query = db().collection('saved_vehicles').where('vehicleId', '==', vehicleId);

  if (since) {
    query = db()
      .collection('saved_vehicles')
      .where('vehicleId', '==', vehicleId)
      .where('savedAt', '>=', since);
  }

  const snapshot = await query.get();
  return snapshot.size;
}

async function countInquiries(vehicleId: string, since: string | null): Promise<number> {
  let query = db().collection('inquiries').where('vehicleId', '==', vehicleId);

  if (since) {
    query = db()
      .collection('inquiries')
      .where('vehicleId', '==', vehicleId)
      .where('timestamp', '>=', since);
  }

  const snapshot = await query.get();
  return snapshot.size;
}

export async function getListingAnalytics(
  vehicleId: string,
  range: ListingAnalyticsRange
): Promise<ListingAnalyticsResponse> {
  const since = resolveSince(range);
  const until = new Date().toISOString();

  const [events, activeSaves, inquiryCount] = await Promise.all([
    fetchListingEvents(vehicleId, since),
    countActiveSaves(vehicleId, since),
    countInquiries(vehicleId, since),
  ]);

  let searchImpressions = 0;
  let totalPageViews = 0;
  let totalPhotoEngagements = 0;
  let totalSectionViews = 0;
  let carouselSwipes = 0;
  let photoViews = 0;

  const pageViewSessions = new Set<string>();
  const dwellDurations: number[] = [];
  const sectionStats = new Map<string, { viewCount: number; sessions: Set<string> }>();
  const dailyStats = new Map<
    string,
    { impressions: number; pageViews: number; pageViewSessions: Set<string> }
  >();
  const photosBySurface = { hero: 0, carousel: 0, gallery: 0 };

  for (const event of events) {
    const dateKey = utcDateKey(event.timestamp);

    if (!dailyStats.has(dateKey)) {
      dailyStats.set(dateKey, { impressions: 0, pageViews: 0, pageViewSessions: new Set() });
    }
    const daily = dailyStats.get(dateKey)!;

    switch (event.eventType) {
      case 'impression':
        searchImpressions += 1;
        daily.impressions += 1;
        break;
      case 'page_view':
        totalPageViews += 1;
        pageViewSessions.add(event.sessionId);
        daily.pageViews += 1;
        daily.pageViewSessions.add(event.sessionId);
        break;
      case 'page_leave':
        if (event.metadata?.durationSeconds !== undefined) {
          dwellDurations.push(event.metadata.durationSeconds);
        }
        break;
      case 'photo_view':
        totalPhotoEngagements += 1;
        photoViews += 1;
        if (event.metadata?.surface === 'hero') photosBySurface.hero += 1;
        if (event.metadata?.surface === 'carousel') photosBySurface.carousel += 1;
        if (event.metadata?.surface === 'gallery') photosBySurface.gallery += 1;
        break;
      case 'carousel_swipe':
        totalPhotoEngagements += 1;
        carouselSwipes += 1;
        if (event.metadata?.surface === 'hero') photosBySurface.hero += 1;
        if (event.metadata?.surface === 'carousel') photosBySurface.carousel += 1;
        if (event.metadata?.surface === 'gallery') photosBySurface.gallery += 1;
        break;
      case 'section_view': {
        totalSectionViews += 1;
        const sectionId = event.metadata?.sectionId;
        if (sectionId) {
          if (!sectionStats.has(sectionId)) {
            sectionStats.set(sectionId, { viewCount: 0, sessions: new Set() });
          }
          const section = sectionStats.get(sectionId)!;
          section.viewCount += 1;
          section.sessions.add(event.sessionId);
        }
        break;
      }
      default:
        break;
    }
  }

  const clickThroughRate = Math.min(
    100,
    Math.max(0, safeDivide(totalPageViews, searchImpressions, 0) * 100)
  );

  const avgDwellTimeSeconds =
    dwellDurations.length > 0
      ? safeDivide(
          dwellDurations.reduce((sum, value) => sum + value, 0),
          dwellDurations.length,
          0
        )
      : 0;

  const sections = [...sectionStats.entries()]
    .map(([sectionId, stats]) => ({
      sectionId,
      label: SECTION_LABELS[sectionId] ?? sectionId,
      viewCount: stats.viewCount,
      uniqueSessions: stats.sessions.size,
    }))
    .sort((a, b) => b.viewCount - a.viewCount);

  const daily = [...dailyStats.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      impressions: stats.impressions,
      pageViews: stats.pageViews,
      uniqueVisitors: stats.pageViewSessions.size,
    }));

  return ListingAnalyticsResponseSchema.parse({
    vehicleId,
    range,
    since: since ?? events[0]?.timestamp ?? until,
    until,
    summary: {
      searchImpressions,
      clickThroughRate,
      totalPageViews,
      uniqueVisitors: pageViewSessions.size,
      avgDwellTimeSeconds,
      totalPhotoEngagements,
      totalSectionViews,
      activeSaves,
      inquiryCount,
    },
    sections,
    daily,
    photos: {
      carouselSwipes,
      photoViews,
      bySurface: photosBySurface,
    },
  });
}
