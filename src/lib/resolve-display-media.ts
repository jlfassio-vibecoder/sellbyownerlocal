import type { VehicleResponse } from '../schemas';

export function resolveHeroImageUrls(vehicle: VehicleResponse): string[] {
  const urls = vehicle.heroImageUrls ?? [];
  if (urls.length > 0) return urls;
  const first = vehicle.images?.[0];
  return first ? [first] : [];
}

export function resolveCarouselImageUrls(vehicle: VehicleResponse): string[] {
  const urls = vehicle.carouselImageUrls ?? [];
  if (urls.length > 0) return urls;
  return vehicle.images ?? [];
}

export function resolveMarketImageUrls(vehicle: VehicleResponse): string[] {
  const urls = vehicle.marketImageUrls ?? [];
  if (urls.length > 0) return urls;
  return (vehicle.images ?? []).slice(0, 6);
}
