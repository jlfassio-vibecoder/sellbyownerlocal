import type { FavoriteItem } from '../schemas';
import { FavoriteCategorySchema, FavoriteItemSchema } from '../schemas';

export type FavoriteCategory = 'vehicle' | 'clothing';

/** @deprecated Use FavoriteItem from schemas — kept for backward-compatible imports */
export type GuestFavorite = FavoriteItem;

export type { FavoriteItem };

/** Device storage key — kept as guest_favorites for backward compatibility. */
const STORAGE_KEY = 'guest_favorites';
const LEGACY_CHANGE_EVENT = 'guest-favorites-changed';
export const FAVORITES_CHANGE_EVENT = 'favorites-changed';

function isFavoriteItem(value: unknown): value is FavoriteItem {
  const parsed = FavoriteItemSchema.safeParse(value);
  return parsed.success;
}

function readStorage(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isFavoriteItem);
  } catch {
    return [];
  }
}

function writeStorage(items: FavoriteItem[]): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notifyFavoritesChanged();
}

/** Notify all islands/subscribers that favorites changed (local or server). */
export function notifyFavoritesChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT));
  // Keep legacy event for any remaining listeners during rollout.
  window.dispatchEvent(new CustomEvent(LEGACY_CHANGE_EVENT));
}

export function getDeviceFavorites(): FavoriteItem[] {
  return readStorage();
}

/** @deprecated Use getDeviceFavorites */
export function getGuestFavorites(): FavoriteItem[] {
  return getDeviceFavorites();
}

export function isDeviceFavorite(id: string): boolean {
  return readStorage().some((item) => item.id === id);
}

/** @deprecated Use isDeviceFavorite */
export function isGuestFavorite(id: string): boolean {
  return isDeviceFavorite(id);
}

export function setDeviceFavorites(items: FavoriteItem[]): void {
  writeStorage(items.filter(isFavoriteItem));
}

export function clearDeviceFavorites(): void {
  writeStorage([]);
}

/**
 * Toggle a favorite in device storage.
 * @returns true if the item is now saved, false if removed
 */
export function toggleDeviceFavorite(item: FavoriteItem): boolean {
  const parsed = FavoriteItemSchema.safeParse(item);
  if (!parsed.success) return isDeviceFavorite(item.id);

  const items = readStorage();
  const index = items.findIndex((entry) => entry.id === parsed.data.id);

  if (index >= 0) {
    items.splice(index, 1);
    writeStorage(items);
    return false;
  }

  writeStorage([...items, parsed.data]);
  return true;
}

/** @deprecated Use toggleDeviceFavorite */
export function toggleGuestFavorite(item: FavoriteItem): boolean {
  return toggleDeviceFavorite(item);
}

export function subscribeFavorites(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => listener();
  window.addEventListener(FAVORITES_CHANGE_EVENT, handler);
  window.addEventListener(LEGACY_CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(FAVORITES_CHANGE_EVENT, handler);
    window.removeEventListener(LEGACY_CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

/** @deprecated Use subscribeFavorites */
export function subscribeGuestFavorites(listener: () => void): () => void {
  return subscribeFavorites(listener);
}

export function groupFavoritesBySeller(items: FavoriteItem[]): Map<string, FavoriteItem[]> {
  const groups = new Map<string, FavoriteItem[]>();

  for (const item of items) {
    if (!item.sellerId || item.sellerId === 'unknown') continue;
    const existing = groups.get(item.sellerId) ?? [];
    existing.push(item);
    groups.set(item.sellerId, existing);
  }

  return groups;
}

export function isValidFavoriteCategory(value: unknown): value is FavoriteCategory {
  return FavoriteCategorySchema.safeParse(value).success;
}
