export type FavoriteCategory = 'vehicle' | 'clothing';

export interface GuestFavorite {
  id: string;
  title: string;
  price: number;
  category: FavoriteCategory;
  sellerId: string;
}

export interface FavoriteItem {
  id: string;
  title: string;
  price: number;
  category: FavoriteCategory;
  sellerId: string;
}

const STORAGE_KEY = 'guest_favorites';
const CHANGE_EVENT = 'guest-favorites-changed';

function readStorage(): GuestFavorite[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is GuestFavorite =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as GuestFavorite).id === 'string' &&
        typeof (item as GuestFavorite).title === 'string' &&
        typeof (item as GuestFavorite).price === 'number' &&
        typeof (item as GuestFavorite).sellerId === 'string' &&
        ((item as GuestFavorite).category === 'vehicle' ||
          (item as GuestFavorite).category === 'clothing')
    );
  } catch {
    return [];
  }
}

function writeStorage(items: GuestFavorite[]): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getGuestFavorites(): GuestFavorite[] {
  return readStorage();
}

export function isGuestFavorite(id: string): boolean {
  return readStorage().some((item) => item.id === id);
}

export function toggleGuestFavorite(item: GuestFavorite): boolean {
  const items = readStorage();
  const index = items.findIndex((entry) => entry.id === item.id);

  if (index >= 0) {
    items.splice(index, 1);
    writeStorage(items);
    return false;
  }

  writeStorage([...items, item]);
  return true;
}

export function subscribeGuestFavorites(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => listener();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
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
