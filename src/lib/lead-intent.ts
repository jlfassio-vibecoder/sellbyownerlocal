import { isPublicListingEvent } from './analytics-actor';
import { getActiveApparelForSeller } from './clothing-api';
import { db } from './firebase-admin';
import type { ListingEvent } from '../schemas';

export type IntentTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LeadIntentResult {
  score: number;
  tier: IntentTier;
  factors: string[];
}

export interface LeadIntentSignals {
  pdpViews: number;
  totalDwellSeconds: number;
  cartValue: number;
  distinctVisitDays: number;
  quoteItemCount: number;
}

export interface SessionEngagementResult extends LeadIntentResult {
  visitDays: number;
  favoriteCount: number;
  lastSeenAt: string;
}

const SESSION_EVENT_LIMIT = 500;
const VISIT_LOOKBACK_DAYS = 14;
const CART_VALUE_CAP = 500;

export function resolveIntentTier(score: number): IntentTier {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function utcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatUsd(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

function formatDwell(seconds: number): string {
  if (seconds <= 0) return '0s dwell';
  if (seconds >= 60) {
    return `${Math.round(seconds / 60)}m dwell`;
  }
  return `${Math.round(seconds)}s dwell`;
}

export function buildPriceByClothingId(
  catalog: Array<{ id: string; price: number; salePrice?: number }>
): Map<string, number> {
  return new Map(
    catalog.map((item) => [item.id, item.salePrice ?? item.price])
  );
}

export function extractLeadIntentSignals(
  events: ListingEvent[],
  priceByClothingId: Map<string, number>,
  quoteItemCount: number,
  now: Date = new Date()
): LeadIntentSignals {
  let pdpViews = 0;
  let totalDwellSeconds = 0;
  const favoriteNet = new Map<string, number>();
  const visitDays = new Set<string>();

  const lookbackStart = new Date(now);
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - VISIT_LOOKBACK_DAYS);
  lookbackStart.setUTCHours(0, 0, 0, 0);
  const lookbackIso = lookbackStart.toISOString();

  for (const event of events) {
    if (event.timestamp >= lookbackIso) {
      visitDays.add(utcDayKey(event.timestamp));
    }

    if (
      event.eventType === 'page_view' &&
      event.clothingId &&
      (event.surface === 'apparel_pdp' || !event.surface)
    ) {
      pdpViews += 1;
    }

    if (event.eventType === 'page_leave') {
      const duration = event.metadata?.durationSeconds;
      if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
        totalDwellSeconds += duration;
      }
    }

    if (event.eventType === 'favorite_add' && event.clothingId) {
      favoriteNet.set(
        event.clothingId,
        (favoriteNet.get(event.clothingId) ?? 0) + 1
      );
    }
    if (event.eventType === 'favorite_remove' && event.clothingId) {
      favoriteNet.set(
        event.clothingId,
        (favoriteNet.get(event.clothingId) ?? 0) - 1
      );
    }
  }

  let cartValue = 0;
  for (const [clothingId, net] of favoriteNet) {
    if (net <= 0) continue;
    cartValue += priceByClothingId.get(clothingId) ?? 0;
  }

  return {
    pdpViews,
    totalDwellSeconds,
    cartValue,
    distinctVisitDays: visitDays.size,
    quoteItemCount: Math.max(0, quoteItemCount),
  };
}

export function scoreLeadIntentFromSignals(signals: LeadIntentSignals): LeadIntentResult {
  const viewPts = Math.min(15, signals.pdpViews * 5);
  const dwellPts = Math.min(15, Math.floor(signals.totalDwellSeconds / 20));
  const cartPts = Math.min(
    25,
    Math.floor((signals.cartValue / CART_VALUE_CAP) * 25)
  );
  const visitPts = Math.min(20, signals.distinctVisitDays * 5);
  const quotePts = Math.min(25, signals.quoteItemCount * 8);

  const score = Math.min(100, viewPts + dwellPts + cartPts + visitPts + quotePts);
  const tier = resolveIntentTier(score);

  const factors: string[] = [];
  factors.push(`${signals.pdpViews} PDP views · ${formatDwell(signals.totalDwellSeconds)}`);
  factors.push(`${formatUsd(signals.cartValue)} in favorites`);
  factors.push(`${signals.distinctVisitDays} active days (14d)`);
  factors.push(
    `${signals.quoteItemCount} item${signals.quoteItemCount === 1 ? '' : 's'} in quote`
  );

  return { score, tier, factors };
}

function netFavoriteCount(events: ListingEvent[]): number {
  const favoriteNet = new Map<string, number>();
  for (const event of events) {
    if (!event.clothingId) continue;
    if (event.eventType === 'favorite_add') {
      favoriteNet.set(event.clothingId, (favoriteNet.get(event.clothingId) ?? 0) + 1);
    } else if (event.eventType === 'favorite_remove') {
      favoriteNet.set(event.clothingId, (favoriteNet.get(event.clothingId) ?? 0) - 1);
    }
  }
  let count = 0;
  for (const net of favoriteNet.values()) {
    if (net > 0) count += 1;
  }
  return count;
}

function quoteDepthFromEvents(events: ListingEvent[]): number {
  let maxDepth = 0;
  for (const event of events) {
    if (event.eventType !== 'quote_open' && event.eventType !== 'quote_submit') {
      continue;
    }
    const fromIds = event.metadata?.clothingIds?.length ?? 0;
    const fromCount = event.metadata?.favoriteCount ?? 0;
    maxDepth = Math.max(maxDepth, fromIds, fromCount);
  }
  return maxDepth;
}

export function scoreSessionEngagement(
  events: ListingEvent[],
  priceByClothingId: Map<string, number>,
  now: Date = new Date()
): SessionEngagementResult {
  const ordered = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const lastSeenAt = ordered[ordered.length - 1]?.timestamp ?? now.toISOString();
  const quoteItemCount = quoteDepthFromEvents(ordered);
  const signals = extractLeadIntentSignals(
    ordered,
    priceByClothingId,
    quoteItemCount,
    now
  );
  const scored = scoreLeadIntentFromSignals(signals);

  return {
    ...scored,
    visitDays: signals.distinctVisitDays,
    favoriteCount: netFavoriteCount(ordered),
    lastSeenAt,
  };
}

async function fetchSessionListingEvents(sessionId: string): Promise<ListingEvent[]> {
  const snapshot = await db()
    .collection('listing_events')
    .where('sessionId', '==', sessionId)
    .orderBy('timestamp', 'asc')
    .limit(SESSION_EVENT_LIMIT)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      sessionId: data.sessionId,
      vehicleId: data.vehicleId,
      clothingId: data.clothingId,
      sellerId: data.sellerId,
      eventType: data.eventType,
      surface: data.surface ?? undefined,
      metadata: data.metadata ?? undefined,
      actor: data.actor ?? undefined,
      timestamp: data.timestamp,
    } as ListingEvent;
  });
}

/**
 * Score a quote lead from the buyer's session events + lead item count.
 */
export async function calculateLeadIntentScore(
  leadId: string,
  sessionId: string,
  sellerId: string
): Promise<LeadIntentResult> {
  const [leadSnap, catalog, rawEvents] = await Promise.all([
    db().collection('leads').doc(leadId).get(),
    getActiveApparelForSeller(sellerId),
    fetchSessionListingEvents(sessionId),
  ]);

  const leadData = leadSnap.exists ? (leadSnap.data() as Record<string, unknown>) : null;
  const items = Array.isArray(leadData?.items) ? leadData.items : [];
  const quoteItemCount = items.length;

  const events = rawEvents
    .filter((event) => event.sellerId === sellerId)
    .filter(isPublicListingEvent);

  const priceByClothingId = buildPriceByClothingId(catalog);
  const signals = extractLeadIntentSignals(events, priceByClothingId, quoteItemCount);
  return scoreLeadIntentFromSignals(signals);
}
