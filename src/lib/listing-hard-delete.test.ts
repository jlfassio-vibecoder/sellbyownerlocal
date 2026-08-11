import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertListingHardDeletable,
  chunkForFirestoreBatch,
  FIRESTORE_BATCH_LIMIT,
  HARD_DELETE_PRESERVED_COLLECTIONS,
  isListingHardDeletable,
  ListingNotHardDeletableError,
  planHardDeleteCascadeTargets,
} from './listing-hard-delete';

describe('isListingHardDeletable', () => {
  it('accepts only archived', () => {
    assert.equal(isListingHardDeletable('archived'), true);
    assert.equal(isListingHardDeletable('active'), false);
    assert.equal(isListingHardDeletable('pending'), false);
    assert.equal(isListingHardDeletable('sold'), false);
    assert.equal(isListingHardDeletable('draft'), false);
  });
});

describe('assertListingHardDeletable', () => {
  it('throws typed error for non-archived statuses', () => {
    assert.throws(
      () => assertListingHardDeletable('active'),
      (error: unknown) =>
        error instanceof ListingNotHardDeletableError &&
        error.status === 400 &&
        error.currentStatus === 'active'
    );
  });

  it('does not throw for archived', () => {
    assert.doesNotThrow(() => assertListingHardDeletable('archived'));
  });
});

describe('planHardDeleteCascadeTargets', () => {
  it('cascades saved_clothing for apparel and never plans leads or events', () => {
    const plan = planHardDeleteCascadeTargets('clothing');
    assert.equal(plan.listingCollection, 'clothing_listings');
    assert.equal(plan.saveCollection, 'saved_clothing');
    assert.deepEqual(plan.preservedCollections, [
      'leads',
      'inquiries',
      'listing_events',
    ]);
    assert.equal(plan.preservedCollections.includes(plan.saveCollection), false);
    for (const preserved of HARD_DELETE_PRESERVED_COLLECTIONS) {
      assert.notEqual(plan.listingCollection, preserved);
      assert.notEqual(plan.saveCollection, preserved);
    }
  });

  it('cascades saved_vehicles for vehicles and preserves analytics collections', () => {
    const plan = planHardDeleteCascadeTargets('vehicle');
    assert.equal(plan.listingCollection, 'vehicles');
    assert.equal(plan.saveCollection, 'saved_vehicles');
    assert.ok(plan.preservedCollections.includes('leads'));
    assert.ok(plan.preservedCollections.includes('listing_events'));
    assert.ok(plan.preservedCollections.includes('inquiries'));
  });
});

describe('chunkForFirestoreBatch', () => {
  it('chunks at the Firestore batch limit', () => {
    const items = Array.from({ length: FIRESTORE_BATCH_LIMIT + 3 }, (_, i) => i);
    const chunks = chunkForFirestoreBatch(items);
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0]?.length, FIRESTORE_BATCH_LIMIT);
    assert.equal(chunks[1]?.length, 3);
  });

  it('returns an empty array for empty input', () => {
    assert.deepEqual(chunkForFirestoreBatch([]), []);
  });
});
