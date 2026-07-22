import type { ClothingListing, VehicleResponse } from '../schemas';
import {
  resolveCarouselImageUrls,
  resolveGalleryPhotos,
  resolveHeroImageUrls,
} from './resolve-display-media';
import { priceFormatter } from '../utils/formatters';

export const DEFAULT_OG_IMAGE = '/og-default.jpg';

export const CLOTHING_DEFAULT_OG_DESCRIPTION =
  'Check out this premium apparel item from our catalog.';

export function resolveAbsoluteUrl(pathOrUrl: string, origin: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return new URL(path, origin).href;
}

export function truncateDescription(text: string, max = 150): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function extractTrimFromStyleLine(
  styleLine: string,
  make: string,
  model: string
): string | undefined {
  const normalized = styleLine.trim();
  if (!normalized) return undefined;

  const lower = normalized.toLowerCase();
  const makeLower = make.toLowerCase();
  const modelLower = model.toLowerCase();

  if (lower === makeLower || lower === modelLower) return undefined;
  if (lower === `${makeLower} ${modelLower}`) return undefined;

  const modelIndex = lower.indexOf(modelLower);
  if (modelIndex >= 0) {
    const afterModel = normalized.slice(modelIndex + model.length).trim();
    if (afterModel.length > 0) return afterModel;
  }

  if (!lower.includes(makeLower) && !lower.includes(modelLower)) {
    return normalized;
  }

  return undefined;
}

export function buildVehicleSeoTitle(vehicle: VehicleResponse): string {
  const trim = vehicle.monroney?.styleLine
    ? extractTrimFromStyleLine(vehicle.monroney.styleLine, vehicle.make, vehicle.model)
    : undefined;

  const base = trim
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model} ${trim}`
    : `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return `${base} - ${priceFormatter.format(vehicle.price)}`;
}

export function buildVehicleSeoDescription(vehicle: VehicleResponse): string {
  const subtitle = vehicle.sellersNote?.subtitle?.trim();
  if (subtitle) return truncateDescription(subtitle);

  const firstPitchBody = vehicle.sellersNote?.blocks?.[0]?.body?.trim();
  if (firstPitchBody) return truncateDescription(firstPitchBody);

  return truncateDescription(vehicle.description);
}

export function resolveVehicleOgImage(vehicle: VehicleResponse): string | undefined {
  const heroUrl = resolveHeroImageUrls(vehicle)[0];
  if (heroUrl) return heroUrl;

  const carouselUrl = resolveCarouselImageUrls(vehicle)[0];
  if (carouselUrl) return carouselUrl;

  const galleryUrl = resolveGalleryPhotos(vehicle)[0]?.url;
  if (galleryUrl) return galleryUrl;

  return undefined;
}

export function buildClothingSeoTitle(listing: ClothingListing): string {
  return `${listing.title} · ${listing.brand}`;
}

export function buildClothingSeoDescription(listing: ClothingListing): string {
  const description = listing.description?.trim();
  if (description) return truncateDescription(description);
  return CLOTHING_DEFAULT_OG_DESCRIPTION;
}

export function resolveClothingOgImage(listing: ClothingListing): string | undefined {
  return listing.galleryPhotos?.[0] || undefined;
}

export function buildStorefrontSeoTitle(storefrontTitle: string): string {
  return `${storefrontTitle} · Apparel Storefront · Sell By Owner Local`;
}

export function buildStorefrontSeoDescription(
  storefrontTitle: string,
  storefrontTagline?: string
): string {
  const tagline = storefrontTagline?.trim();
  if (tagline) return tagline;
  return `Shop active wholesale apparel from ${storefrontTitle} on Sell By Owner Local.`;
}

export function resolveStorefrontOgImage(
  listings: ClothingListing[]
): string | undefined {
  return listings[0]?.galleryPhotos?.[0] || undefined;
}
