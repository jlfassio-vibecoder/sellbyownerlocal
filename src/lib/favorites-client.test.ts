import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  clearDeviceFavorites,
  getDeviceFavorites,
  groupFavoritesBySeller,
  isDeviceFavorite,
  setDeviceFavorites,
  subscribeFavorites,
  toggleDeviceFavorite,
  type FavoriteItem,
} from '../utils/favorites';
import { canPersistFavoritesToServer, mergeFavoriteLists } from './favorites-client';
import { meetsVerificationTier } from './verification';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

const sampleItem = (overrides: Partial<FavoriteItem> = {}): FavoriteItem => ({
  id: 'item-1',
  title: 'Test Hoodie',
  price: 12,
  category: 'clothing',
  sellerId: 'seller-1',
  ...overrides,
});

describe('device favorites store', () => {
  beforeEach(() => {
    const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const storage = createMemoryStorage();

    (globalThis as { window?: Window & typeof globalThis }).window = {
      ...(globalThis as object),
      localStorage: storage,
      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(listener);
      },
      removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        listeners.get(type)?.delete(listener);
      },
      dispatchEvent(event: Event) {
        const set = listeners.get(event.type);
        if (!set) return true;
        for (const listener of set) {
          if (typeof listener === 'function') listener(event);
          else listener.handleEvent(event);
        }
        return true;
      },
    } as Window & typeof globalThis;

    (globalThis as { localStorage?: Storage }).localStorage = storage;
    clearDeviceFavorites();
  });

  afterEach(() => {
    clearDeviceFavorites();
  });

  it('toggles add and remove idempotently by id', () => {
    const item = sampleItem();
    assert.equal(toggleDeviceFavorite(item), true);
    assert.equal(isDeviceFavorite(item.id), true);
    assert.equal(getDeviceFavorites().length, 1);

    assert.equal(toggleDeviceFavorite(item), false);
    assert.equal(isDeviceFavorite(item.id), false);
    assert.equal(getDeviceFavorites().length, 0);
  });

  it('replaces device list when setDeviceFavorites is called', () => {
    const item = sampleItem();
    toggleDeviceFavorite(item);
    setDeviceFavorites([sampleItem({ id: 'item-2', title: 'Other' })]);
    assert.equal(getDeviceFavorites().length, 1);
    assert.equal(getDeviceFavorites()[0]?.id, 'item-2');
  });

  it('notifies subscribers on change', () => {
    let calls = 0;
    const unsubscribe = subscribeFavorites(() => {
      calls += 1;
    });

    toggleDeviceFavorite(sampleItem());
    assert.ok(calls >= 1);
    unsubscribe();
  });
});

describe('groupFavoritesBySeller', () => {
  it('groups by seller and skips unknown sellerIds', () => {
    const groups = groupFavoritesBySeller([
      sampleItem({ id: 'a', sellerId: 's1' }),
      sampleItem({ id: 'b', sellerId: 's1' }),
      sampleItem({ id: 'c', sellerId: 'unknown' }),
      sampleItem({ id: 'd', sellerId: 's2' }),
    ]);

    assert.equal(groups.size, 2);
    assert.equal(groups.get('s1')?.length, 2);
    assert.equal(groups.get('s2')?.length, 1);
    assert.equal(groups.has('unknown'), false);
  });
});

describe('favorites helpers', () => {
  it('mergeFavoriteLists dedupes by id with later wins', () => {
    const merged = mergeFavoriteLists(
      [sampleItem({ id: 'a', title: 'First' })],
      [sampleItem({ id: 'a', title: 'Second' }), sampleItem({ id: 'b' })]
    );
    assert.equal(merged.length, 2);
    assert.equal(merged.find((item) => item.id === 'a')?.title, 'Second');
  });

  it('canPersistFavoritesToServer requires login + phone verification', () => {
    assert.equal(canPersistFavoritesToServer(false, 'phone_verified'), false);
    assert.equal(canPersistFavoritesToServer(true, 'anonymous'), false);
    assert.equal(canPersistFavoritesToServer(true, 'phone_verified'), true);
    assert.equal(canPersistFavoritesToServer(true, 'identity_verified'), true);
  });

  it('meetsVerificationTier ranks correctly', () => {
    assert.equal(meetsVerificationTier('anonymous', 'phone_verified'), false);
    assert.equal(meetsVerificationTier('phone_verified', 'phone_verified'), true);
    assert.equal(meetsVerificationTier('identity_verified', 'phone_verified'), true);
  });
});
