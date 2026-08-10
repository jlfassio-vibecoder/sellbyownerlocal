import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isFavoriteQuotable,
  resolveFavoriteAvailability,
  resolveFavoriteListingStatus,
} from './favorites-availability';
import { FavoriteItemSchema, type FavoriteItem } from '../schemas';

function baseItem(overrides: Partial<FavoriteItem> = {}): FavoriteItem {
  return FavoriteItemSchema.parse({
    id: 'item-1',
    title: 'Test Item',
    price: 100,
    category: 'clothing',
    sellerId: 'seller-1',
    ...overrides,
  });
}

describe('resolveFavoriteAvailability', () => {
  it('marks pending and sold as available for display', () => {
    assert.equal(resolveFavoriteAvailability('pending'), 'available');
    assert.equal(resolveFavoriteAvailability('sold'), 'available');
    assert.equal(resolveFavoriteAvailability('active'), 'available');
  });

  it('marks archived, draft, missing, and unknown as unavailable', () => {
    assert.equal(resolveFavoriteAvailability('archived'), 'unavailable');
    assert.equal(resolveFavoriteAvailability('draft'), 'unavailable');
    assert.equal(resolveFavoriteAvailability(null), 'unavailable');
    assert.equal(resolveFavoriteAvailability('nope'), 'unavailable');
  });
});

describe('resolveFavoriteListingStatus', () => {
  it('parses known statuses and ignores invalid values', () => {
    assert.equal(resolveFavoriteListingStatus('sold'), 'sold');
    assert.equal(resolveFavoriteListingStatus('pending'), 'pending');
    assert.equal(resolveFavoriteListingStatus('bogus'), undefined);
  });
});

describe('isFavoriteQuotable', () => {
  it('includes active listings with a known seller', () => {
    assert.equal(
      isFavoriteQuotable(baseItem({ listingStatus: 'active' })),
      true
    );
  });

  it('excludes sold, pending, archived, and missing sellers', () => {
    assert.equal(
      isFavoriteQuotable(baseItem({ listingStatus: 'sold' })),
      false
    );
    assert.equal(
      isFavoriteQuotable(baseItem({ listingStatus: 'pending' })),
      false
    );
    assert.equal(
      isFavoriteQuotable(
        baseItem({ listingStatus: 'archived', availability: 'unavailable' })
      ),
      false
    );
    assert.equal(
      isFavoriteQuotable(baseItem({ sellerId: 'unknown', listingStatus: 'active' })),
      false
    );
  });

  it('treats legacy items without listingStatus as quotable when available', () => {
    assert.equal(isFavoriteQuotable(baseItem()), true);
  });
});

describe('FavoriteItem status fields', () => {
  it('hydrates pending and sold without throwing', () => {
    const pending = FavoriteItemSchema.parse({
      id: 'c1',
      title: 'Jacket',
      price: 50,
      category: 'clothing',
      sellerId: 's1',
      listingStatus: 'pending',
      availability: resolveFavoriteAvailability('pending'),
    });
    assert.equal(pending.listingStatus, 'pending');
    assert.equal(pending.availability, 'available');

    const sold = FavoriteItemSchema.parse({
      id: 'v1',
      title: '2020 Toyota Camry',
      price: 20000,
      category: 'vehicle',
      sellerId: 's1',
      listingStatus: 'sold',
      availability: resolveFavoriteAvailability('sold'),
    });
    assert.equal(sold.listingStatus, 'sold');
    assert.equal(sold.availability, 'available');
  });

  it('marks archived and missing as unavailable', () => {
    const archived = FavoriteItemSchema.parse({
      id: 'c2',
      title: 'Shirt',
      price: 20,
      category: 'clothing',
      sellerId: 's1',
      listingStatus: 'archived',
      availability: resolveFavoriteAvailability('archived'),
    });
    assert.equal(archived.availability, 'unavailable');

    const missing = FavoriteItemSchema.parse({
      id: 'gone',
      title: 'Listing unavailable',
      price: 0,
      category: 'clothing',
      sellerId: 'unknown',
      availability: 'unavailable',
    });
    assert.equal(missing.availability, 'unavailable');
    assert.equal(missing.sellerId, 'unknown');
  });
});
