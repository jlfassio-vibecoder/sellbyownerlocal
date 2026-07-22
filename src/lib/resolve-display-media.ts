import type { GalleryPhoto, VehicleResponse } from '../schemas';

function libraryUrls(vehicle: VehicleResponse): string[] {
  return vehicle.images ?? [];
}

function filterToLibrary(urls: string[], library: string[]): string[] {
  if (library.length === 0) return [];
  const allowed = new Set(library);
  return urls.filter((url) => allowed.has(url));
}

export function resolveHeroImageUrls(vehicle: VehicleResponse): string[] {
  const library = libraryUrls(vehicle);
  const urls = filterToLibrary(vehicle.heroImageUrls ?? [], library);
  if (urls.length > 0) return urls;
  const first = library[0];
  return first ? [first] : [];
}

export function resolveCarouselImageUrls(vehicle: VehicleResponse): string[] {
  const library = libraryUrls(vehicle);
  const urls = filterToLibrary(vehicle.carouselImageUrls ?? [], library);
  if (urls.length > 0) return urls;
  return library;
}

export function resolveMarketImageUrls(vehicle: VehicleResponse): string[] {
  const library = libraryUrls(vehicle);
  const urls = filterToLibrary(vehicle.marketImageUrls ?? [], library);
  if (urls.length > 0) return urls;
  return library.slice(0, 6);
}

export function resolveGalleryPhotos(vehicle: VehicleResponse): GalleryPhoto[] {
  const library = libraryUrls(vehicle);
  const allowed = new Set(library);
  return (vehicle.galleryPhotos ?? []).filter((photo) => allowed.has(photo.url));
}
