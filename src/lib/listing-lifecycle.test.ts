import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertListingStatusTransition,
  canTransitionListingStatus,
  InvalidListingStatusTransitionError,
  isBuyerCtaEnabledStatus,
  isPubliclyViewableListingStatus,
  isTransactionalListingStatus,
  LISTING_STATUS_TRANSITIONS,
  type ListingLifecycleStatus,
} from './listing-lifecycle';

const ALL_STATUSES = Object.keys(
  LISTING_STATUS_TRANSITIONS
) as ListingLifecycleStatus[];

describe('canTransitionListingStatus', () => {
  it('allows identity transitions', () => {
    for (const status of ALL_STATUSES) {
      assert.equal(canTransitionListingStatus(status, status), true);
    }
  });

  it('allows the documented transition matrix', () => {
    assert.equal(canTransitionListingStatus('draft', 'active'), true);
    assert.equal(canTransitionListingStatus('draft', 'archived'), true);
    assert.equal(canTransitionListingStatus('active', 'pending'), true);
    assert.equal(canTransitionListingStatus('active', 'sold'), true);
    assert.equal(canTransitionListingStatus('pending', 'sold'), true);
    assert.equal(canTransitionListingStatus('sold', 'active'), true);
    assert.equal(canTransitionListingStatus('archived', 'draft'), true);
  });

  it('rejects illegal transitions', () => {
    assert.equal(canTransitionListingStatus('draft', 'pending'), false);
    assert.equal(canTransitionListingStatus('draft', 'sold'), false);
    assert.equal(canTransitionListingStatus('sold', 'pending'), false);
    assert.equal(canTransitionListingStatus('sold', 'draft'), false);
    assert.equal(canTransitionListingStatus('archived', 'pending'), false);
  });
});

describe('assertListingStatusTransition', () => {
  it('throws typed error for illegal transitions', () => {
    assert.throws(
      () => assertListingStatusTransition('draft', 'sold'),
      (error: unknown) =>
        error instanceof InvalidListingStatusTransitionError &&
        error.from === 'draft' &&
        error.to === 'sold' &&
        error.status === 400
    );
  });

  it('does not throw for legal transitions', () => {
    assert.doesNotThrow(() => assertListingStatusTransition('active', 'pending'));
  });
});

describe('visibility helpers', () => {
  it('marks active/pending/sold as publicly viewable', () => {
    assert.equal(isPubliclyViewableListingStatus('active'), true);
    assert.equal(isPubliclyViewableListingStatus('pending'), true);
    assert.equal(isPubliclyViewableListingStatus('sold'), true);
    assert.equal(isPubliclyViewableListingStatus('draft'), false);
    assert.equal(isPubliclyViewableListingStatus('archived'), false);
  });

  it('limits transactional and CTA status to active', () => {
    assert.equal(isTransactionalListingStatus('active'), true);
    assert.equal(isTransactionalListingStatus('pending'), false);
    assert.equal(isBuyerCtaEnabledStatus('active'), true);
    assert.equal(isBuyerCtaEnabledStatus('sold'), false);
  });
});
