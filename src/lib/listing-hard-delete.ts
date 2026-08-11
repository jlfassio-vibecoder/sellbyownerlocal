import type { DocumentReference } from 'firebase-admin/firestore';
import { db } from './firebase-admin';
import { parseListingLifecycleStatus } from './listing-lifecycle';

export type HardDeleteListingCategory = 'clothing' | 'vehicle';

/** Collections that must never be touched by hard-delete cascades. */
export const HARD_DELETE_PRESERVED_COLLECTIONS = [
  'leads',
  'inquiries',
  'listing_events',
] as const;

export const HARD_DELETE_CASCADE_COLLECTIONS = {
  clothing: 'saved_clothing',
  vehicle: 'saved_vehicles',
} as const;

export const FIRESTORE_BATCH_LIMIT = 500;

export class ListingNotHardDeletableError extends Error {
  readonly status = 400;
  readonly currentStatus: string;

  constructor(currentStatus: string) {
    super(
      `Only archived listings can be permanently deleted (current status: ${currentStatus})`
    );
    this.name = 'ListingNotHardDeletableError';
    this.currentStatus = currentStatus;
  }
}

export function isListingHardDeletable(status: unknown): boolean {
  return parseListingLifecycleStatus(status) === 'archived';
}

export function assertListingHardDeletable(status: unknown): void {
  if (!isListingHardDeletable(status)) {
    const label =
      typeof status === 'string' && status.trim() ? status.trim() : 'unknown';
    throw new ListingNotHardDeletableError(label);
  }
}

/** Split refs into Firestore batch-sized chunks (pure, testable). */
export function chunkForFirestoreBatch<T>(items: T[], size = FIRESTORE_BATCH_LIMIT): T[][] {
  if (size < 1) throw new Error('Batch size must be at least 1');
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Declares which collections a hard delete may mutate.
 * Used by unit tests to prove leads/events are never in scope.
 */
export function planHardDeleteCascadeTargets(
  category: HardDeleteListingCategory
): {
  listingCollection: 'clothing_listings' | 'vehicles';
  saveCollection: (typeof HARD_DELETE_CASCADE_COLLECTIONS)[HardDeleteListingCategory];
  preservedCollections: readonly string[];
} {
  return {
    listingCollection: category === 'clothing' ? 'clothing_listings' : 'vehicles',
    saveCollection: HARD_DELETE_CASCADE_COLLECTIONS[category],
    preservedCollections: [...HARD_DELETE_PRESERVED_COLLECTIONS],
  };
}

async function commitDeletes(refs: DocumentReference[]): Promise<number> {
  if (refs.length === 0) return 0;

  let deleted = 0;
  for (const chunk of chunkForFirestoreBatch(refs)) {
    const batch = db().batch();
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

/**
 * Delete all saved_* docs that reference a listing. Does not touch leads,
 * inquiries, or listing_events.
 */
export async function deleteSavedFavoritesForListing(options: {
  category: HardDeleteListingCategory;
  listingId: string;
}): Promise<number> {
  const { category, listingId } = options;
  const { saveCollection } = planHardDeleteCascadeTargets(category);
  const field = category === 'clothing' ? 'clothingId' : 'vehicleId';

  const snapshot = await db()
    .collection(saveCollection)
    .where(field, '==', listingId)
    .get();

  return commitDeletes(snapshot.docs.map((doc) => doc.ref));
}

export async function hardDeleteListingDocuments(options: {
  category: HardDeleteListingCategory;
  listingIds: string[];
}): Promise<number> {
  const { category, listingIds } = options;
  const { listingCollection } = planHardDeleteCascadeTargets(category);
  const refs = listingIds.map((id) => db().collection(listingCollection).doc(id));
  return commitDeletes(refs);
}
