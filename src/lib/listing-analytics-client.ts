import type { ListingEventMetadata, ListingEventType } from '../schemas';

const API_PATH = '/api/analytics/events';

function buildPayload(
  vehicleId: string,
  eventType: ListingEventType,
  metadata?: ListingEventMetadata
): string {
  return JSON.stringify({
    vehicleId,
    eventType,
    ...(metadata ? { metadata } : {}),
  });
}

export function trackListingEvent(
  vehicleId: string,
  eventType: ListingEventType,
  metadata?: ListingEventMetadata
): void {
  const payload = buildPayload(vehicleId, eventType, metadata);

  try {
    void fetch(API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {
      // Analytics must not affect UX
    });
  } catch {
    // Ignore
  }
}

function sessionStorageKey(prefix: string, vehicleId: string, suffix?: string): string {
  return suffix ? `analytics:${prefix}:${vehicleId}:${suffix}` : `analytics:${prefix}:${vehicleId}`;
}

export function trackPageViewOnce(vehicleId: string): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('pv', vehicleId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  trackListingEvent(vehicleId, 'page_view');
}

export function trackSectionViewOnce(vehicleId: string, sectionId: string): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('section', vehicleId, sectionId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  trackListingEvent(vehicleId, 'section_view', { sectionId });
}

export function trackHeroPhotoViewOnce(vehicleId: string): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('hero', vehicleId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  trackListingEvent(vehicleId, 'photo_view', { surface: 'hero', photoIndex: 0 });
}

export function trackPhotoView(
  vehicleId: string,
  photoIndex: number,
  surface: 'hero' | 'carousel' | 'gallery'
): void {
  trackListingEvent(vehicleId, 'photo_view', { photoIndex, surface });
}

export function trackCarouselSwipe(
  vehicleId: string,
  photoIndex: number,
  surface: 'carousel' | 'gallery' = 'carousel'
): void {
  trackListingEvent(vehicleId, 'carousel_swipe', { photoIndex, surface });
}

export function trackImpressionOnce(
  vehicleId: string,
  options: { rank?: number; position?: number }
): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('imp', vehicleId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  trackListingEvent(vehicleId, 'impression', {
    surface: 'search_grid',
    ...(options.rank !== undefined ? { rank: options.rank } : {}),
    ...(options.position !== undefined ? { position: options.position } : {}),
  });
}

export function trackPageLeave(vehicleId: string, durationSeconds: number): void {
  trackListingEvent(vehicleId, 'page_leave', { durationSeconds });
}

export function sendPageLeaveBeacon(vehicleId: string, durationSeconds: number): void {
  const payload = buildPayload(vehicleId, 'page_leave', { durationSeconds });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(API_PATH, blob)) {
        return;
      }
    }
  } catch {
    // Fall through to fetch
  }

  trackPageLeave(vehicleId, durationSeconds);
}
