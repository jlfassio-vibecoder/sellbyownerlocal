import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPublicListingEvent, resolveListingEventActor } from './analytics-actor';

describe('resolveListingEventActor', () => {
  it('returns anon when there is no session', () => {
    assert.deepEqual(resolveListingEventActor(null, 'seller-1'), {
      kind: 'anon',
      isInternal: false,
    });
  });

  it('marks admin emails as internal admin', () => {
    assert.deepEqual(
      resolveListingEventActor(
        { uid: 'admin-1', email: 'office@justinfassio.com' },
        'seller-1'
      ),
      { kind: 'admin', uid: 'admin-1', isInternal: true }
    );
  });

  it('marks listing owner as internal seller', () => {
    assert.deepEqual(
      resolveListingEventActor({ uid: 'seller-1', email: 'owner@example.com' }, 'seller-1'),
      { kind: 'seller', uid: 'seller-1', isInternal: true }
    );
  });

  it('marks authenticated non-owner as user', () => {
    assert.deepEqual(
      resolveListingEventActor({ uid: 'buyer-1', email: 'buyer@example.com' }, 'seller-1'),
      { kind: 'user', uid: 'buyer-1', isInternal: false }
    );
  });
});

describe('isPublicListingEvent', () => {
  it('includes legacy events without actor', () => {
    assert.equal(isPublicListingEvent({}), true);
  });

  it('excludes internal actors', () => {
    assert.equal(
      isPublicListingEvent({ actor: { kind: 'seller', uid: 's1', isInternal: true } }),
      false
    );
  });

  it('includes non-internal actors', () => {
    assert.equal(
      isPublicListingEvent({ actor: { kind: 'user', uid: 'b1', isInternal: false } }),
      true
    );
  });
});
