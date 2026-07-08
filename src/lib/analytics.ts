import { db } from './firebase-admin';
import {
  ListingEventCreateSchema,
  VehicleResponseSchema,
  type ListingEventCreate,
  type ListingEventMetadata,
  type ListingEventType,
} from '../schemas';

export class AnalyticsVehicleNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super('Vehicle not found');
    this.name = 'AnalyticsVehicleNotFoundError';
  }
}

export interface RecordListingEventInput {
  sessionId: string;
  vehicleId: string;
  eventType: ListingEventType;
  metadata?: ListingEventMetadata;
}

export async function recordListingEvent(input: RecordListingEventInput): Promise<void> {
  const parsed = ListingEventCreateSchema.safeParse({
    vehicleId: input.vehicleId,
    eventType: input.eventType,
    metadata: input.metadata,
  });

  if (!parsed.success) {
    throw new Error('Invalid listing event payload');
  }

  const vehicleDoc = await db().collection('vehicles').doc(parsed.data.vehicleId).get();

  if (!vehicleDoc.exists) {
    throw new AnalyticsVehicleNotFoundError();
  }

  const vehicleParsed = VehicleResponseSchema.safeParse({
    id: vehicleDoc.id,
    ...vehicleDoc.data(),
  });

  if (!vehicleParsed.success || vehicleParsed.data.status !== 'active') {
    throw new AnalyticsVehicleNotFoundError();
  }

  await db()
    .collection('listing_events')
    .add({
      sessionId: input.sessionId,
      vehicleId: parsed.data.vehicleId,
      eventType: parsed.data.eventType,
      metadata: parsed.data.metadata ?? null,
      timestamp: new Date().toISOString(),
    });
}

export type { ListingEventCreate, ListingEventMetadata, ListingEventType };
