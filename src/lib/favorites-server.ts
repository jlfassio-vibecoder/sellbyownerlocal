import { mapClothingDoc } from './clothing-api';
import { db } from './firebase-admin';
import { mapVehicleDoc } from './inventory-api';
import { resolveHeroImageUrls } from './resolve-display-media';
import {
  FavoriteItemSchema,
  SavedClothingSchema,
  SavedVehicleSchema,
  type FavoriteItem,
} from '../schemas';

function asRecord(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object') {
    return data as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

async function loadDocFromCollections(
  id: string,
  collections: string[]
): Promise<{ id: string; data: Record<string, unknown>; collection: string } | null> {
  for (const collection of collections) {
    const snapshot = await db().collection(collection).doc(id).get();
    if (snapshot.exists) {
      return {
        id: snapshot.id,
        data: asRecord(snapshot.data()),
        collection,
      };
    }
  }
  return null;
}

function mapVehicleFavorite(id: string, data: Record<string, unknown>): FavoriteItem {
  const sellerId = asString(data.sellerId, 'unknown');
  const parsed = mapVehicleDoc(id, data);

  if (parsed.success) {
    const vehicle = parsed.data;
    const heroImage = resolveHeroImageUrls(vehicle)[0] ?? '';
    return FavoriteItemSchema.parse({
      id: vehicle.id,
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim() || 'Untitled Item',
      price: asNumber(vehicle.price, 0),
      category: 'vehicle',
      sellerId: vehicle.sellerId || sellerId,
      ...(heroImage ? { imageUrl: heroImage } : {}),
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      mileage: vehicle.mileage,
      engine: vehicle.specs.engine,
      drivetrain: vehicle.specs.drivetrain,
      highlights: (vehicle.highlights ?? []).slice(0, 3).map((h) => h.title),
    });
  }

  const year = asNumber(data.year, 0);
  const make = asString(data.make, '');
  const model = asString(data.model, '');
  const composed = [year || '', make, model].filter(Boolean).join(' ').trim();
  const specs =
    data.specs && typeof data.specs === 'object'
      ? (data.specs as Record<string, unknown>)
      : {};
  const images = Array.isArray(data.images) ? data.images : [];
  const firstImage = typeof images[0] === 'string' ? images[0] : '';
  const rawImage = asString(data.heroImage, firstImage);

  return FavoriteItemSchema.parse({
    id,
    title: composed || asString(data.title, 'Untitled Item'),
    price: asNumber(data.price, 0),
    category: 'vehicle',
    sellerId,
    ...(rawImage.startsWith('http') ? { imageUrl: rawImage } : {}),
    ...(year ? { year } : {}),
    ...(make ? { make } : {}),
    ...(model ? { model } : {}),
    mileage: asNumber(data.mileage, 0) || undefined,
    engine: asString(specs.engine, '') || undefined,
    drivetrain: asString(specs.drivetrain, '') || undefined,
  });
}

function mapClothingFavorite(id: string, data: Record<string, unknown>): FavoriteItem {
  const sellerId = asString(data.sellerId, 'unknown');
  const parsed = mapClothingDoc(id, data);

  if (parsed.success) {
    const listing = parsed.data;
    return FavoriteItemSchema.parse({
      id: listing.id,
      title: listing.title || 'Untitled Item',
      price: asNumber(listing.price, 0),
      category: 'clothing',
      sellerId: listing.sellerId || sellerId,
    });
  }

  return FavoriteItemSchema.parse({
    id,
    title: asString(data.title, 'Untitled Item'),
    price: asNumber(data.price, 0),
    category: 'clothing',
    sellerId,
  });
}

function mapMissingFavorite(id: string, category: 'vehicle' | 'clothing'): FavoriteItem {
  return FavoriteItemSchema.parse({
    id,
    title: 'Listing unavailable',
    price: 0,
    category,
    sellerId: 'unknown',
  });
}

function savedDocId(buyerUid: string, itemId: string): string {
  return `${buyerUid}_${itemId}`;
}

function isActiveListing(data: Record<string, unknown>): boolean {
  return data.status === 'active';
}

/**
 * Load all saved favorites for a buyer, hydrating listing metadata.
 */
export async function listFavoritesForBuyer(buyerUid: string): Promise<FavoriteItem[]> {
  const [vehicleSaves, clothingSaves] = await Promise.all([
    db().collection('saved_vehicles').where('buyerUid', '==', buyerUid).get(),
    db().collection('saved_clothing').where('buyerUid', '==', buyerUid).get(),
  ]);

  return Promise.all([
    ...vehicleSaves.docs.map(async (doc) => {
      const vehicleId = asString(doc.data().vehicleId, doc.id.split('_').pop() ?? doc.id);
      if (!vehicleId) {
        return mapMissingFavorite(doc.id, 'vehicle');
      }

      const found = await loadDocFromCollections(vehicleId, [
        'vehicles',
        'listings',
        'clothing_listings',
      ]);

      if (!found) {
        console.warn(`[FAVORITES] Saved vehicle ${vehicleId} missing underlying document`);
        return mapMissingFavorite(vehicleId, 'vehicle');
      }

      if (found.collection === 'clothing_listings') {
        return mapClothingFavorite(found.id, found.data);
      }

      return mapVehicleFavorite(found.id, found.data);
    }),
    ...clothingSaves.docs.map(async (doc) => {
      const clothingId = asString(doc.data().clothingId, doc.id.split('_').pop() ?? doc.id);
      if (!clothingId) {
        return mapMissingFavorite(doc.id, 'clothing');
      }

      const found = await loadDocFromCollections(clothingId, [
        'clothing_listings',
        'listings',
        'vehicles',
      ]);

      if (!found) {
        console.warn(`[FAVORITES] Saved clothing ${clothingId} missing underlying document`);
        return mapMissingFavorite(clothingId, 'clothing');
      }

      if (found.collection === 'vehicles') {
        return mapVehicleFavorite(found.id, found.data);
      }

      return mapClothingFavorite(found.id, found.data);
    }),
  ]);
}

type UpsertResult = { status: 'saved' } | { status: 'skipped'; reason: string };

/**
 * Upsert a single favorite for a verified buyer. Skips inactive/missing listings.
 */
export async function upsertFavoriteForBuyer(
  buyerUid: string,
  item: FavoriteItem
): Promise<UpsertResult> {
  const collections =
    item.category === 'clothing'
      ? ['clothing_listings', 'listings', 'vehicles']
      : ['vehicles', 'listings', 'clothing_listings'];

  const found = await loadDocFromCollections(item.id, collections);
  if (!found) {
    return { status: 'skipped', reason: 'not_found' };
  }

  if (!isActiveListing(found.data)) {
    return { status: 'skipped', reason: 'inactive' };
  }

  const kind =
    found.collection === 'clothing_listings'
      ? 'clothing'
      : found.collection === 'vehicles'
        ? 'vehicle'
        : item.category;

  const firestoreId = found.id;
  const savedAt = new Date().toISOString();

  if (kind === 'vehicle') {
    const docRef = db().collection('saved_vehicles').doc(savedDocId(buyerUid, firestoreId));
    const existing = await docRef.get();
    if (existing.exists) {
      return { status: 'saved' };
    }
    await docRef.set(
      SavedVehicleSchema.parse({
        vehicleId: firestoreId,
        buyerUid,
        savedAt,
      })
    );
    return { status: 'saved' };
  }

  const docRef = db().collection('saved_clothing').doc(savedDocId(buyerUid, firestoreId));
  const existing = await docRef.get();
  if (existing.exists) {
    return { status: 'saved' };
  }
  await docRef.set(
    SavedClothingSchema.parse({
      clothingId: firestoreId,
      buyerUid,
      savedAt,
    })
  );
  return { status: 'saved' };
}
