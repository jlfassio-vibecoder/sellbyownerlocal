import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertSellerOwnsItem,
  enrichFavoriteFromClothingData,
  enrichFavoriteFromVehicleData,
  isActiveListingStatus,
} from './lead-items';

describe('isActiveListingStatus', () => {
  it('accepts only active', () => {
    assert.equal(isActiveListingStatus('active'), true);
    assert.equal(isActiveListingStatus('draft'), false);
    assert.equal(isActiveListingStatus('archived'), false);
    assert.equal(isActiveListingStatus('sold'), false);
  });
});

describe('enrichFavoriteFromClothingData', () => {
  it('enriches active clothing with image, sizes, colors, and path', () => {
    const item = enrichFavoriteFromClothingData(
      'cloth-1',
      {
        status: 'active',
        sellerId: 'seller-a',
        title: 'Denim Jacket',
        price: 42,
        sizes: ['S', 'M'],
        colors: ['Indigo'],
        galleryPhotos: ['https://cdn.example.com/jacket.jpg'],
      },
      'acme-apparel'
    );

    assert.ok(item);
    assert.equal(item!.title, 'Denim Jacket');
    assert.equal(item!.imageUrl, 'https://cdn.example.com/jacket.jpg');
    assert.deepEqual(item!.sizes, ['S', 'M']);
    assert.deepEqual(item!.colors, ['Indigo']);
    assert.equal(item!.listingPath, '/marketplace/clothing/acme-apparel/cloth-1');
  });

  it('returns null for inactive clothing', () => {
    const item = enrichFavoriteFromClothingData(
      'cloth-1',
      {
        status: 'archived',
        sellerId: 'seller-a',
        title: 'Old Tee',
        price: 10,
        galleryPhotos: [],
      },
      'acme-apparel'
    );
    assert.equal(item, null);
  });
});

describe('enrichFavoriteFromVehicleData', () => {
  it('rejects dealer_comp and inactive vehicles', () => {
    assert.equal(
      enrichFavoriteFromVehicleData('v1', {
        status: 'active',
        sellerId: 's1',
        inventorySource: 'dealer_comp',
        year: 2020,
        make: 'Ford',
        model: 'F-150',
        price: 1,
      }),
      null
    );
    assert.equal(
      enrichFavoriteFromVehicleData('v1', {
        status: 'sold',
        sellerId: 's1',
        year: 2020,
        make: 'Ford',
        model: 'F-150',
        price: 1,
      }),
      null
    );
  });

  it('builds a vehicle listing path for active vehicles', () => {
    const item = enrichFavoriteFromVehicleData('abc12345678901234567', {
      status: 'active',
      sellerId: 's1',
      year: 2022,
      make: 'Toyota',
      model: 'Tacoma',
      price: 28000,
      images: ['https://cdn.example.com/truck.jpg'],
    });
    assert.ok(item);
    assert.equal(item!.category, 'vehicle');
    assert.match(item!.listingPath ?? '', /^\/vehicles\/2022-toyota-tacoma-/);
  });
});

describe('assertSellerOwnsItem', () => {
  it('flags seller mismatch', () => {
    const base = enrichFavoriteFromClothingData(
      'c1',
      {
        status: 'active',
        sellerId: 'seller-a',
        title: 'Hat',
        price: 5,
        galleryPhotos: [],
      },
      'seller-a'
    );
    assert.ok(base);
    const result = assertSellerOwnsItem(base!, 'other-seller');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.kind, 'seller_mismatch');
    }
  });
});
