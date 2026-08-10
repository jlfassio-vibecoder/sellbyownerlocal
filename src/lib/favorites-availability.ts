import type { FavoriteItem, ListingLifecycleStatus } from '../schemas';
import { parseListingLifecycleStatus } from './listing-lifecycle';

export type FavoriteAvailability = 'available' | 'unavailable';

export function resolveFavoriteAvailability(
  status: unknown | null | undefined
): FavoriteAvailability {
  if (status == null) return 'unavailable';
  const parsed = parseListingLifecycleStatus(status);
  if (!parsed || parsed === 'archived' || parsed === 'draft') {
    return 'unavailable';
  }
  return 'available';
}

export function resolveFavoriteListingStatus(
  status: unknown | null | undefined
): ListingLifecycleStatus | undefined {
  return parseListingLifecycleStatus(status) ?? undefined;
}

/** Active listings with a known seller may be included in quote requests. */
export function isFavoriteQuotable(item: FavoriteItem): boolean {
  if (!item.sellerId || item.sellerId === 'unknown') return false;
  if (item.availability === 'unavailable') return false;
  // Device/legacy favorites may omit listingStatus; treat as active when available.
  if (item.listingStatus == null) return true;
  return item.listingStatus === 'active';
}

export function isFavoriteUnavailable(item: FavoriteItem): boolean {
  return item.availability === 'unavailable';
}
