import { db } from './firebase-admin';
import { z } from 'zod';
import { resolveHeroImageUrls } from './resolve-display-media';
import { VehicleResponseSchema, type VehicleResponse } from '../schemas';
import type { InventoryVehicle } from '../types/inventory-vehicle';

export type { InventoryVehicle } from '../types/inventory-vehicle';

export function mapVehicleDoc(id: string, data: Record<string, unknown>) {
  return VehicleResponseSchema.safeParse({ id, ...data });
}

function toInventoryVehicle(vehicle: VehicleResponse): InventoryVehicle {
  const heroImage = resolveHeroImageUrls(vehicle)[0] ?? '';

  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    price: vehicle.price,
    mileage: vehicle.mileage,
    engine: vehicle.specs.engine,
    drivetrain: vehicle.specs.drivetrain,
    highlights: (vehicle.highlights ?? []).slice(0, 3).map((h) => h.title),
    heroImage,
  };
}

export async function getPublishedInventory(): Promise<InventoryVehicle[]> {
  const snapshot = await db()
    .collection('vehicles')
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.flatMap((doc) => {
    const parsed = mapVehicleDoc(doc.id, doc.data() as Record<string, unknown>);
    if (!parsed.success && import.meta.env.DEV) {
      console.error(`Vehicle ${doc.id} skipped (validation failed):`, z.flattenError(parsed.error));
    }
    return parsed.success ? [toInventoryVehicle(parsed.data)] : [];
  });
}
