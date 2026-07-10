import {
  FavoritesListResponseSchema,
  type FavoriteItem,
  type VerificationTier,
} from '../schemas';
import {
  clearDeviceFavorites,
  getDeviceFavorites,
  isDeviceFavorite,
  notifyFavoritesChanged,
  setDeviceFavorites,
  subscribeFavorites,
  toggleDeviceFavorite,
  type FavoriteCategory,
} from '../utils/favorites';
import { saveApiPath } from './use-save-favorite';
import { meetsVerificationTier } from './verification';

export { subscribeFavorites, notifyFavoritesChanged, getDeviceFavorites, isDeviceFavorite };

export function canPersistFavoritesToServer(
  isLoggedIn: boolean,
  verificationTier: VerificationTier
): boolean {
  return isLoggedIn && meetsVerificationTier(verificationTier, 'phone_verified');
}

export async function fetchFavoritesFromServer(): Promise<FavoriteItem[]> {
  const res = await fetch('/api/favorites', { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error('Failed to load favorites');
  }

  const data = await res.json();
  const parsed = FavoritesListResponseSchema.safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.items;
}

export async function syncFavoritesToServer(items: FavoriteItem[]): Promise<FavoriteItem[]> {
  const res = await fetch('/api/favorites/sync', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.code === 'VERIFICATION_REQUIRED') {
      throw new Error('Verify your phone number to sync favorites.');
    }
    throw new Error(data.error || 'Failed to sync favorites');
  }

  const data = await res.json();
  const parsed = FavoritesListResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('Invalid sync response');
  }
  return parsed.data.items;
}

export async function toggleServerFavorite(
  itemId: string,
  category: FavoriteCategory
): Promise<boolean> {
  const res = await fetch(saveApiPath(category, itemId), {
    method: 'POST',
    credentials: 'same-origin',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.code === 'VERIFICATION_REQUIRED') {
      throw new Error('Verify your phone number to save listings.');
    }
    throw new Error(data.error || 'Failed to update save status');
  }

  const data = await res.json();
  return Boolean(data.saved);
}

/**
 * Local-first toggle for guests / unverified users.
 * Updates device storage and notifies all islands.
 */
export function toggleLocalFavorite(item: FavoriteItem): boolean {
  return toggleDeviceFavorite(item);
}

/**
 * Verified-user toggle: hits Firestore, then notifies islands to refresh.
 * Optionally mirrors into device storage so other islands can read instantly
 * before their server refresh completes.
 */
export async function toggleVerifiedFavorite(
  item: FavoriteItem,
  currentlySaved: boolean
): Promise<{ saved: boolean; error?: string }> {
  // Optimistic device mirror for cross-island badge updates.
  const deviceItems = getDeviceFavorites();
  if (currentlySaved) {
    setDeviceFavorites(deviceItems.filter((entry) => entry.id !== item.id));
  } else if (!deviceItems.some((entry) => entry.id === item.id)) {
    setDeviceFavorites([...deviceItems, item]);
  } else {
    notifyFavoritesChanged();
  }

  try {
    const serverSaved = await toggleServerFavorite(item.id, item.category);
    const mirrored = getDeviceFavorites();
    if (serverSaved) {
      if (!mirrored.some((entry) => entry.id === item.id)) {
        setDeviceFavorites([...mirrored, item]);
      } else {
        notifyFavoritesChanged();
      }
    } else {
      setDeviceFavorites(mirrored.filter((entry) => entry.id !== item.id));
    }
    return { saved: serverSaved };
  } catch (err) {
    // Revert optimistic mirror.
    if (currentlySaved) {
      const reverted = getDeviceFavorites();
      if (!reverted.some((entry) => entry.id === item.id)) {
        setDeviceFavorites([...reverted, item]);
      } else {
        notifyFavoritesChanged();
      }
    } else {
      setDeviceFavorites(getDeviceFavorites().filter((entry) => entry.id !== item.id));
    }
    return {
      saved: currentlySaved,
      error: err instanceof Error ? err.message : 'Failed to update save status',
    };
  }
}

/**
 * Merge device favorites into the server account, then clear the device bucket.
 * Idempotent — safe to call on every verified session mount.
 * Concurrent callers share one in-flight promise.
 */
let migrateInFlight: Promise<FavoriteItem[]> | null = null;

export async function migrateDeviceFavoritesToServer(): Promise<FavoriteItem[]> {
  if (migrateInFlight) return migrateInFlight;

  migrateInFlight = (async () => {
    const deviceItems = getDeviceFavorites();
    const merged = await syncFavoritesToServer(deviceItems);
    clearDeviceFavorites();
    notifyFavoritesChanged();
    return merged;
  })().finally(() => {
    migrateInFlight = null;
  });

  return migrateInFlight;
}

export function mergeFavoriteLists(
  primary: FavoriteItem[],
  secondary: FavoriteItem[]
): FavoriteItem[] {
  const byId = new Map<string, FavoriteItem>();
  for (const item of [...primary, ...secondary]) {
    byId.set(item.id, item);
  }
  return [...byId.values()];
}
