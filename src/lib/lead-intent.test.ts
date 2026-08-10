import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractLeadIntentSignals,
  resolveIntentTier,
  scoreLeadIntentFromSignals,
  scoreSessionEngagement,
} from './lead-intent';
import type { ListingEvent } from '../schemas';

const NOW = new Date('2026-08-10T12:00:00.000Z');

function event(
  partial: Partial<ListingEvent> & Pick<ListingEvent, 'eventType' | 'timestamp'>
): ListingEvent {
  return {
    sessionId: 'session-1',
    sellerId: 'seller-1',
    ...partial,
  };
}

describe('resolveIntentTier', () => {
  it('maps score boundaries', () => {
    assert.equal(resolveIntentTier(0), 'LOW');
    assert.equal(resolveIntentTier(39), 'LOW');
    assert.equal(resolveIntentTier(40), 'MEDIUM');
    assert.equal(resolveIntentTier(69), 'MEDIUM');
    assert.equal(resolveIntentTier(70), 'HIGH');
    assert.equal(resolveIntentTier(100), 'HIGH');
  });
});

describe('scoreLeadIntentFromSignals', () => {
  it('scores quote-only leads as low intent', () => {
    const result = scoreLeadIntentFromSignals({
      pdpViews: 0,
      totalDwellSeconds: 0,
      cartValue: 0,
      distinctVisitDays: 0,
      quoteItemCount: 1,
    });
    assert.equal(result.score, 8);
    assert.equal(result.tier, 'LOW');
    assert.ok(result.factors.some((factor) => factor.includes('1 item in quote')));
  });

  it('caps dwell and cart value buckets', () => {
    const result = scoreLeadIntentFromSignals({
      pdpViews: 10,
      totalDwellSeconds: 400,
      cartValue: 2000,
      distinctVisitDays: 1,
      quoteItemCount: 0,
    });
    // views 15 + dwell 15 + cart 25 + visits 5 + quote 0 = 60
    assert.equal(result.score, 60);
    assert.equal(result.tier, 'MEDIUM');
  });

  it('reaches high intent with strong engagement', () => {
    const result = scoreLeadIntentFromSignals({
      pdpViews: 3,
      totalDwellSeconds: 300,
      cartValue: 500,
      distinctVisitDays: 4,
      quoteItemCount: 4,
    });
    // 15 + 15 + 25 + 20 + 25 = 100
    assert.equal(result.score, 100);
    assert.equal(result.tier, 'HIGH');
  });
});

describe('extractLeadIntentSignals', () => {
  it('nets favorites and uses sale price when present', () => {
    const events = [
      event({
        eventType: 'favorite_add',
        clothingId: 'c1',
        timestamp: '2026-08-09T10:00:00.000Z',
      }),
      event({
        eventType: 'favorite_add',
        clothingId: 'c2',
        timestamp: '2026-08-09T11:00:00.000Z',
      }),
      event({
        eventType: 'favorite_remove',
        clothingId: 'c2',
        timestamp: '2026-08-09T12:00:00.000Z',
      }),
      event({
        eventType: 'page_view',
        clothingId: 'c1',
        surface: 'apparel_pdp',
        timestamp: '2026-08-09T13:00:00.000Z',
      }),
      event({
        eventType: 'page_leave',
        clothingId: 'c1',
        surface: 'apparel_pdp',
        metadata: { durationSeconds: 40 },
        timestamp: '2026-08-09T13:01:00.000Z',
      }),
    ];

    const prices = new Map([
      ['c1', 150],
      ['c2', 200],
    ]);

    const signals = extractLeadIntentSignals(events, prices, 2, NOW);
    assert.equal(signals.pdpViews, 1);
    assert.equal(signals.totalDwellSeconds, 40);
    assert.equal(signals.cartValue, 150);
    assert.equal(signals.distinctVisitDays, 1);
    assert.equal(signals.quoteItemCount, 2);
  });

  it('counts distinct visit days within 14 days', () => {
    const events = [
      event({
        eventType: 'page_view',
        clothingId: 'c1',
        surface: 'apparel_pdp',
        timestamp: '2026-08-01T10:00:00.000Z',
      }),
      event({
        eventType: 'page_view',
        clothingId: 'c1',
        surface: 'apparel_pdp',
        timestamp: '2026-08-05T10:00:00.000Z',
      }),
      event({
        eventType: 'page_view',
        clothingId: 'c1',
        surface: 'apparel_pdp',
        timestamp: '2026-07-20T10:00:00.000Z',
      }),
    ];

    const signals = extractLeadIntentSignals(events, new Map(), 0, NOW);
    assert.equal(signals.distinctVisitDays, 2);
    assert.equal(signals.pdpViews, 3);
  });
});

describe('scoreSessionEngagement', () => {
  it('derives quote depth from quote metadata', () => {
    const events = [
      event({
        eventType: 'favorite_add',
        clothingId: 'c1',
        timestamp: '2026-08-08T10:00:00.000Z',
      }),
      event({
        eventType: 'quote_open',
        metadata: { favoriteCount: 3 },
        timestamp: '2026-08-08T11:00:00.000Z',
      }),
      event({
        eventType: 'quote_submit',
        metadata: { clothingIds: ['c1', 'c2'], favoriteCount: 2 },
        timestamp: '2026-08-08T11:05:00.000Z',
      }),
    ];

    const result = scoreSessionEngagement(
      events,
      new Map([
        ['c1', 100],
        ['c2', 100],
      ]),
      NOW
    );

    assert.equal(result.favoriteCount, 1);
    assert.equal(result.visitDays, 1);
    assert.ok(result.score >= 8);
    assert.ok(result.factors.some((factor) => factor.includes('3 items in quote')));
  });
});
