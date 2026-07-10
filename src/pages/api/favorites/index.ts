import type { APIRoute } from 'astro';
import { AuthError, getOptionalSession } from '../../../lib/auth';
import { mapClothingDoc } from '../../../lib/clothing-api';
import { db } from '../../../lib/firebase-admin';
import { mapVehicleDoc } from '../../../lib/inventory-api';
import {
  FavoriteItemSchema,
  FavoritesListResponseSchema,
  type FavoriteItem,
} from '../../../schemas';

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
    return FavoriteItemSchema.parse({
      id: vehicle.id,
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim() || 'Untitled Item',
      price: asNumber(vehicle.price, 0),
      category: 'vehicle',
      sellerId: vehicle.sellerId || sellerId,
    });
  }

  const year = asNumber(data.year, 0);
  const make = asString(data.make, '');
  const model = asString(data.model, '');
  const composed = [year || '', make, model].filter(Boolean).join(' ').trim();

  return FavoriteItemSchema.parse({
    id,
    title: composed || asString(data.title, 'Untitled Item'),
    price: asNumber(data.price, 0),
    category: 'vehicle',
    sellerId,
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
    title: 'Untitled Item',
    price: 0,
    category,
    sellerId: 'unknown',
  });
}

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await getOptionalSession(request, cookies);
    if (!session) {
      const response = FavoritesListResponseSchema.parse({ items: [] });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [vehicleSaves, clothingSaves] = await Promise.all([
      db().collection('saved_vehicles').where('buyerUid', '==', session.uid).get(),
      db().collection('saved_clothing').where('buyerUid', '==', session.uid).get(),
    ]);

    const items = await Promise.all([
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
          console.warn(`[FAVORITES API] Saved vehicle ${vehicleId} missing underlying document`);
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
          console.warn(`[FAVORITES API] Saved clothing ${clothingId} missing underlying document`);
          return mapMissingFavorite(clothingId, 'clothing');
        }

        if (found.collection === 'vehicles') {
          return mapVehicleFavorite(found.id, found.data);
        }

        return mapClothingFavorite(found.id, found.data);
      }),
    ]);

    const response = FavoritesListResponseSchema.parse({ items });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const response = FavoritesListResponseSchema.parse({ items: [] });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('GET /api/favorites failed', error);
    return new Response(JSON.stringify({ error: 'Failed to load favorites' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
