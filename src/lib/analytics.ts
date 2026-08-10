import { resolveListingEventActor, type AnalyticsActorSession } from './analytics-actor';
import { getUserProfile } from './buyer-profile';
import { getClothingListingById } from './clothing-api';
import { db } from './firebase-admin';
import {
  ListingEventCreateSchema,
  VehicleResponseSchema,
  type ListingEventCreate,
  type ListingEventMetadata,
  type ListingEventSurface,
  type ListingEventType,
} from '../schemas';

export class AnalyticsEntityNotFoundError extends Error {
  readonly status = 404;

  constructor(message = 'Entity not found') {
    super(message);
    this.name = 'AnalyticsEntityNotFoundError';
  }
}

export interface RecordListingEventInput {
  sessionId: string;
  eventType: ListingEventType;
  vehicleId?: string;
  clothingId?: string;
  sellerId?: string;
  surface?: ListingEventSurface;
  metadata?: ListingEventMetadata;
  userSession?: AnalyticsActorSession;
}

function defaultVehicleSurface(
  eventType: ListingEventType,
  surface?: ListingEventSurface
): ListingEventSurface {
  if (surface) return surface;
  if (eventType === 'impression') return 'vehicle_grid';
  return 'vehicle_pdp';
}

export async function recordListingEvent(input: RecordListingEventInput): Promise<void> {
  const parsed = ListingEventCreateSchema.safeParse({
    vehicleId: input.vehicleId,
    clothingId: input.clothingId,
    sellerId: input.sellerId,
    eventType: input.eventType,
    surface: input.surface,
    metadata: input.metadata,
  });

  if (!parsed.success) {
    throw new Error('Invalid listing event payload');
  }

  const { eventType, metadata } = parsed.data;
  let vehicleId = parsed.data.vehicleId;
  let clothingId = parsed.data.clothingId;
  let sellerId = parsed.data.sellerId;
  let surface = parsed.data.surface;

  if (vehicleId) {
    const vehicleDoc = await db().collection('vehicles').doc(vehicleId).get();

    if (!vehicleDoc.exists) {
      throw new AnalyticsEntityNotFoundError('Vehicle not found');
    }

    const vehicleParsed = VehicleResponseSchema.safeParse({
      id: vehicleDoc.id,
      ...vehicleDoc.data(),
    });

    if (!vehicleParsed.success || vehicleParsed.data.status !== 'active') {
      throw new AnalyticsEntityNotFoundError('Vehicle not found');
    }

    sellerId = vehicleParsed.data.sellerId;
    surface = defaultVehicleSurface(eventType, surface);
  } else if (clothingId) {
    const listing = await getClothingListingById(clothingId);
    if (!listing) {
      throw new AnalyticsEntityNotFoundError('Clothing listing not found');
    }
    sellerId = listing.sellerId;
    surface = surface ?? 'apparel_pdp';
  } else if (surface === 'apparel_storefront' && sellerId) {
    const profile = await getUserProfile(sellerId);
    if (!profile) {
      throw new AnalyticsEntityNotFoundError('Storefront seller not found');
    }
  } else {
    throw new Error('Invalid listing event payload');
  }

  if (!sellerId) {
    throw new Error('Unable to resolve sellerId for listing event');
  }

  const actor = resolveListingEventActor(input.userSession ?? null, sellerId);

  const doc: Record<string, unknown> = {
    sessionId: input.sessionId,
    eventType,
    metadata: metadata ?? null,
    surface,
    sellerId,
    actor,
    timestamp: new Date().toISOString(),
  };

  if (vehicleId) {
    doc.vehicleId = vehicleId;
  }
  if (clothingId) {
    doc.clothingId = clothingId;
  }

  await db().collection('listing_events').add(doc);
}

export type { ListingEventCreate, ListingEventMetadata, ListingEventType };
