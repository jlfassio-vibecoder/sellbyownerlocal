import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFunnelStages,
  humanizeApparelEvent,
  needsSkuOptimization,
  safeConversionRate,
} from './apparel-analytics';
import type { ListingEvent } from '../schemas';

describe('safeConversionRate', () => {
  it('returns 0 when there are no PDP views', () => {
    assert.equal(safeConversionRate(2, 0), 0);
  });

  it('caps at 100 percent', () => {
    assert.equal(safeConversionRate(5, 2), 100);
  });

  it('computes quotes over PDP views', () => {
    assert.equal(safeConversionRate(1, 4), 25);
  });
});

describe('needsSkuOptimization', () => {
  it('flags high PDP views with zero quotes', () => {
    assert.equal(
      needsSkuOptimization({ pdpViews: 5, favoriteAdds: 0, quoteSubmits: 0 }),
      true
    );
  });

  it('flags repeated favorites with zero quotes', () => {
    assert.equal(
      needsSkuOptimization({ pdpViews: 1, favoriteAdds: 2, quoteSubmits: 0 }),
      true
    );
  });

  it('does not flag when quotes exist', () => {
    assert.equal(
      needsSkuOptimization({ pdpViews: 10, favoriteAdds: 5, quoteSubmits: 1 }),
      false
    );
  });
});

describe('buildFunnelStages', () => {
  it('sets null drop-off on the first stage', () => {
    const stages = buildFunnelStages({
      views: 100,
      favorites: 40,
      quoteOpen: 20,
      quoteSubmit: 10,
    });
    assert.equal(stages[0].dropOffPercent, null);
    assert.equal(stages[1].dropOffPercent, 60);
    assert.equal(stages[2].dropOffPercent, 50);
    assert.equal(stages[3].dropOffPercent, 50);
  });

  it('uses 0 drop-off when the previous stage is empty', () => {
    const stages = buildFunnelStages({
      views: 0,
      favorites: 0,
      quoteOpen: 0,
      quoteSubmit: 0,
    });
    assert.equal(stages[1].dropOffPercent, 0);
  });
});

describe('humanizeApparelEvent', () => {
  const titles = new Map([['c1', 'Denim Jacket']]);

  it('labels storefront views', () => {
    const event = {
      sessionId: 's1',
      eventType: 'page_view',
      surface: 'apparel_storefront',
      timestamp: '2026-08-10T00:00:00.000Z',
    } as ListingEvent;
    assert.equal(humanizeApparelEvent(event, titles), 'Viewed storefront');
  });

  it('labels favorites with title', () => {
    const event = {
      sessionId: 's1',
      clothingId: 'c1',
      eventType: 'favorite_add',
      timestamp: '2026-08-10T00:00:00.000Z',
    } as ListingEvent;
    assert.equal(humanizeApparelEvent(event, titles), 'Favorited Denim Jacket');
  });

  it('labels quote submit', () => {
    const event = {
      sessionId: 's1',
      eventType: 'quote_submit',
      timestamp: '2026-08-10T00:00:00.000Z',
    } as ListingEvent;
    assert.equal(humanizeApparelEvent(event, titles), 'Submitted quote');
  });
});
