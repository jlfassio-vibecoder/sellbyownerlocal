import { db } from './firebase-admin';
import { z } from 'zod';
import { ClothingListingSchema, type ClothingListing } from '../schemas';

function toCreatedAt(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

export function mapClothingDoc(id: string, data: Record<string, unknown>) {
  return ClothingListingSchema.safeParse({
    id,
    ...data,
    createdAt: toCreatedAt(data.createdAt),
  });
}

export async function getClothingInventory(): Promise<ClothingListing[]> {
  const snapshot = await db()
    .collection('clothing_listings')
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.flatMap((doc) => {
    const parsed = mapClothingDoc(doc.id, doc.data() as Record<string, unknown>);
    if (!parsed.success && import.meta.env.DEV) {
      console.error(`Clothing ${doc.id} skipped (validation failed):`, z.flattenError(parsed.error));
    }
    return parsed.success ? [parsed.data] : [];
  });
}

export async function getClothingListingById(id: string): Promise<ClothingListing | null> {
  const snapshot = await db().collection('clothing_listings').doc(id).get();

  if (!snapshot.exists) {
    return null;
  }

  const parsed = mapClothingDoc(snapshot.id, snapshot.data() as Record<string, unknown>);

  if (!parsed.success) {
    if (import.meta.env.DEV) {
      console.error(`Clothing ${id} failed validation:`, z.flattenError(parsed.error));
    }
    return null;
  }

  if (parsed.data.status !== 'active') {
    return null;
  }

  return parsed.data;
}

export async function getApparelCatalogForSeller(sellerId: string): Promise<ClothingListing[]> {
  const databaseId = process.env.FIRESTORE_DATABASE_ID ?? '(default)';
  let snapshot;

  try {
    snapshot = await db()
      .collection('clothing_listings')
      .where('sellerId', '==', sellerId)
      .orderBy('createdAt', 'desc')
      .get();
  } catch (error) {
    console.error(
      `getApparelCatalogForSeller compound query failed (db=${databaseId}, sellerId=${sellerId}):`,
      error
    );
    try {
      snapshot = await db().collection('clothing_listings').where('sellerId', '==', sellerId).get();
      console.warn(
        'getApparelCatalogForSeller fell back to sellerId-only query (sort in memory). Check Firestore indexes if this persists.'
      );
    } catch (fallbackError) {
      console.error(
        `getApparelCatalogForSeller fallback query failed (db=${databaseId}, sellerId=${sellerId}):`,
        fallbackError
      );
      throw fallbackError;
    }
  }

  const listings = snapshot.docs.flatMap((doc) => {
    const parsed = mapClothingDoc(doc.id, doc.data() as Record<string, unknown>);
    if (!parsed.success) {
      console.error(
        `Clothing ${doc.id} skipped (validation failed, db=${databaseId}):`,
        z.flattenError(parsed.error)
      );
      return [];
    }
    return [parsed.data];
  });

  listings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return listings;
}

export async function getApparelListingForSellerById(
  id: string,
  sellerId: string
): Promise<ClothingListing | null> {
  const snapshot = await db().collection('clothing_listings').doc(id).get();

  if (!snapshot.exists) {
    return null;
  }

  const parsed = mapClothingDoc(snapshot.id, snapshot.data() as Record<string, unknown>);

  if (!parsed.success) {
    if (import.meta.env.DEV) {
      console.error(`Clothing ${id} failed validation:`, z.flattenError(parsed.error));
    }
    return null;
  }

  if (parsed.data.sellerId !== sellerId) {
    return null;
  }

  return parsed.data;
}
