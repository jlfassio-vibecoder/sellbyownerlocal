import type {
  ListingEventMetadata,
  ListingEventSurface,
  ListingEventType,
} from '../schemas';

const API_PATH = '/api/analytics/events';

type TrackTarget =
  | { vehicleId: string; clothingId?: never; sellerId?: never }
  | { clothingId: string; vehicleId?: never; sellerId?: string }
  | { sellerId: string; vehicleId?: never; clothingId?: never };

function buildPayload(
  target: TrackTarget,
  eventType: ListingEventType,
  options?: {
    surface?: ListingEventSurface;
    metadata?: ListingEventMetadata;
  }
): string {
  return JSON.stringify({
    ...target,
    eventType,
    ...(options?.surface ? { surface: options.surface } : {}),
    ...(options?.metadata ? { metadata: options.metadata } : {}),
  });
}

export function trackListingEvent(
  vehicleId: string,
  eventType: ListingEventType,
  metadata?: ListingEventMetadata,
  surface?: ListingEventSurface
): void {
  const payload = buildPayload(
    { vehicleId },
    eventType,
    {
      metadata,
      surface:
        surface ??
        (eventType === 'impression' ? 'vehicle_grid' : 'vehicle_pdp'),
    }
  );

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

function postAnalyticsPayload(payload: string): void {
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

function sessionStorageKey(prefix: string, id: string, suffix?: string): string {
  return suffix ? `analytics:${prefix}:${id}:${suffix}` : `analytics:${prefix}:${id}`;
}

export function trackPageViewOnce(vehicleId: string): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('pv', vehicleId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  trackListingEvent(vehicleId, 'page_view', undefined, 'vehicle_pdp');
}

export function trackSectionViewOnce(vehicleId: string, sectionId: string): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('section', vehicleId, sectionId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  trackListingEvent(vehicleId, 'section_view', { sectionId }, 'vehicle_pdp');
}

export function trackHeroPhotoViewOnce(vehicleId: string): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('hero', vehicleId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  trackListingEvent(
    vehicleId,
    'photo_view',
    { surface: 'hero', photoIndex: 0 },
    'vehicle_pdp'
  );
}

export function trackPhotoView(
  vehicleId: string,
  photoIndex: number,
  surface: 'hero' | 'carousel' | 'gallery'
): void {
  trackListingEvent(vehicleId, 'photo_view', { photoIndex, surface }, 'vehicle_pdp');
}

export function trackCarouselSwipe(
  vehicleId: string,
  photoIndex: number,
  surface: 'carousel' | 'gallery' = 'carousel'
): void {
  trackListingEvent(vehicleId, 'carousel_swipe', { photoIndex, surface }, 'vehicle_pdp');
}

export function trackImpressionOnce(
  vehicleId: string,
  options: { rank?: number; position?: number }
): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('imp', vehicleId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  trackListingEvent(
    vehicleId,
    'impression',
    {
      surface: 'search_grid',
      ...(options.rank !== undefined ? { rank: options.rank } : {}),
      ...(options.position !== undefined ? { position: options.position } : {}),
    },
    'vehicle_grid'
  );
}

export function trackPageLeave(vehicleId: string, durationSeconds: number): void {
  trackListingEvent(vehicleId, 'page_leave', { durationSeconds }, 'vehicle_pdp');
}

export function sendPageLeaveBeacon(vehicleId: string, durationSeconds: number): void {
  const payload = buildPayload(
    { vehicleId },
    'page_leave',
    { surface: 'vehicle_pdp', metadata: { durationSeconds } }
  );

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

export function trackApparelPageLeave(
  clothingId: string,
  durationSeconds: number
): void {
  postAnalyticsPayload(
    buildPayload(
      { clothingId },
      'page_leave',
      { surface: 'apparel_pdp', metadata: { durationSeconds } }
    )
  );
}

export function sendApparelPageLeaveBeacon(
  clothingId: string,
  durationSeconds: number
): void {
  const payload = buildPayload(
    { clothingId },
    'page_leave',
    { surface: 'apparel_pdp', metadata: { durationSeconds } }
  );

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

  trackApparelPageLeave(clothingId, durationSeconds);
}

/** Apparel storefront catalog page_view (once per tab session per seller). */
export function trackApparelStorefrontViewOnce(sellerId: string): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('apparel-sf', sellerId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  postAnalyticsPayload(
    buildPayload(
      { sellerId },
      'page_view',
      { surface: 'apparel_storefront' }
    )
  );
}

/** Apparel item PDP page_view (once per tab session per clothing id). */
export function trackApparelPdpViewOnce(clothingId: string): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('apparel-pdp', clothingId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  postAnalyticsPayload(
    buildPayload({ clothingId }, 'page_view', { surface: 'apparel_pdp' })
  );
}

/** Apparel grid card impression (once per tab session per clothing id). */
export function trackApparelImpressionOnce(
  clothingId: string,
  options: { rank?: number; position?: number } = {}
): void {
  if (typeof sessionStorage === 'undefined') return;

  const key = sessionStorageKey('apparel-imp', clothingId);
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, '1');
  postAnalyticsPayload(
    buildPayload(
      { clothingId },
      'impression',
      {
        surface: 'apparel_storefront',
        metadata: {
          ...(options.rank !== undefined ? { rank: options.rank } : {}),
          ...(options.position !== undefined ? { position: options.position } : {}),
        },
      }
    )
  );
}

/** Clothing favorite add/remove for apparel funnel analytics. */
export function trackFavoriteToggle(options: {
  clothingId: string;
  sellerId: string;
  added: boolean;
}): void {
  postAnalyticsPayload(
    buildPayload(
      { clothingId: options.clothingId, sellerId: options.sellerId },
      options.added ? 'favorite_add' : 'favorite_remove'
    )
  );
}

/** Quote modal opened — emit once per seller represented in the modal. */
export function trackQuoteOpen(options: {
  sellerId: string;
  favoriteCount: number;
}): void {
  postAnalyticsPayload(
    buildPayload(
      { sellerId: options.sellerId },
      'quote_open',
      { metadata: { favoriteCount: options.favoriteCount } }
    )
  );
}
