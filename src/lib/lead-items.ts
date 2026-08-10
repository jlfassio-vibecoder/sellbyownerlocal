import { FavoriteItemSchema, type FavoriteItem } from '../schemas';
import {
  getClothingListingPath,
  getVehicleListingPath,
} from '../utils/url-helpers';

export type LeadItemResolveFailure =
  | { kind: 'not_found_or_inactive' }
  | { kind: 'seller_mismatch'; listingSellerId: string };

export type LeadItemResolveResult =
  | { ok: true; item: FavoriteItem }
  | { ok: false; failure: LeadItemResolveFailure };

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => entry.trim());
  return items.length > 0 ? items : undefined;
}

function firstHttpUrl(value: unknown): string | undefined {
  if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && /^https?:\/\//i.test(entry.trim())) {
        return entry.trim();
      }
      if (entry && typeof entry === 'object' && 'url' in entry) {
        const url = (entry as { url?: unknown }).url;
        if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) {
          return url.trim();
        }
      }
    }
  }
  return undefined;
}

export function isActiveListingStatus(status: unknown): boolean {
  return status === 'active';
}

export function enrichFavoriteFromClothingData(
  id: string,
  data: Record<string, unknown>,
  storefrontSegment: string
): FavoriteItem | null {
  if (!isActiveListingStatus(data.status)) return null;
  if (typeof data.sellerId !== 'string' || !data.sellerId.trim()) return null;

  const sellerId = data.sellerId.trim();
  const sizes = asStringArray(data.sizes);
  const colors = asStringArray(data.colors);
  const imageUrl = firstHttpUrl(data.galleryPhotos);

  return FavoriteItemSchema.parse({
    id,
    title: asString(data.title, 'Untitled Item'),
    price: asNumber(data.price, 0),
    category: 'clothing',
    sellerId,
    ...(imageUrl ? { imageUrl } : {}),
    ...(sizes ? { sizes } : {}),
    ...(colors ? { colors } : {}),
    listingPath: getClothingListingPath(id, storefrontSegment),
  });
}

export function enrichFavoriteFromVehicleData(
  id: string,
  data: Record<string, unknown>
): FavoriteItem | null {
  if (!isActiveListingStatus(data.status)) return null;
  if (data.inventorySource === 'dealer_comp') return null;
  if (typeof data.sellerId !== 'string' || !data.sellerId.trim()) return null;

  const sellerId = data.sellerId.trim();
  const year = asNumber(data.year, 0);
  const make = asString(data.make, '');
  const model = asString(data.model, '');
  const composed = [year || '', make, model].filter(Boolean).join(' ').trim();
  const imageUrl =
    firstHttpUrl(data.heroImageUrls) ??
    firstHttpUrl(data.images) ??
    firstHttpUrl(data.galleryPhotos) ??
    firstHttpUrl(data.heroImage);

  const itemYear = year || new Date().getFullYear();
  const itemMake = make || 'Vehicle';
  const itemModel = model || 'Listing';

  return FavoriteItemSchema.parse({
    id,
    title: composed || asString(data.title, 'Untitled Item'),
    price: asNumber(data.price, 0),
    category: 'vehicle',
    sellerId,
    ...(imageUrl ? { imageUrl } : {}),
    ...(year ? { year } : {}),
    ...(make ? { make } : {}),
    ...(model ? { model } : {}),
    listingPath: getVehicleListingPath({
      id,
      year: itemYear,
      make: itemMake,
      model: itemModel,
    }),
  });
}

/**
 * Enrich a legacy/generic `listings` doc when present. Treat as clothing-shaped
 * when galleryPhotos are string URLs; otherwise minimal active listing fields.
 */
export function enrichFavoriteFromGenericListingData(
  id: string,
  data: Record<string, unknown>,
  storefrontSegment: string
): FavoriteItem | null {
  if (!isActiveListingStatus(data.status)) return null;
  if (typeof data.sellerId !== 'string' || !data.sellerId.trim()) return null;

  const sellerId = data.sellerId.trim();
  const imageUrl = firstHttpUrl(data.galleryPhotos) ?? firstHttpUrl(data.images);
  const sizes = asStringArray(data.sizes);
  const colors = asStringArray(data.colors);
  const category = data.category === 'vehicle' ? 'vehicle' : 'clothing';

  if (category === 'vehicle') {
    return enrichFavoriteFromVehicleData(id, data);
  }

  return FavoriteItemSchema.parse({
    id,
    title: asString(data.title, 'Untitled Item'),
    price: asNumber(data.price, 0),
    category: 'clothing',
    sellerId,
    ...(imageUrl ? { imageUrl } : {}),
    ...(sizes ? { sizes } : {}),
    ...(colors ? { colors } : {}),
    listingPath: getClothingListingPath(id, storefrontSegment),
  });
}

export function assertSellerOwnsItem(
  item: FavoriteItem,
  expectedSellerId: string
): LeadItemResolveResult {
  if (item.sellerId !== expectedSellerId) {
    return {
      ok: false,
      failure: { kind: 'seller_mismatch', listingSellerId: item.sellerId },
    };
  }
  return { ok: true, item };
}
