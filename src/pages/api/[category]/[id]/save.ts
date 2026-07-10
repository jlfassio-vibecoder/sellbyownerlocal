import type { APIRoute } from 'astro';
import {
  AuthError,
  requireAuthenticated,
  requireVerificationTier,
  unauthorizedResponse,
  verificationRequiredResponse,
  VerificationRequiredError,
} from '../../../../lib/auth';
import { mapClothingDoc } from '../../../../lib/clothing-api';
import { db } from '../../../../lib/firebase-admin';
import { mapVehicleDoc } from '../../../../lib/inventory-api';
import {
  SavedClothingSchema,
  SavedClothingStatusResponseSchema,
  SavedClothingToggleResponseSchema,
  SavedVehicleSchema,
  SavedVehicleStatusResponseSchema,
  SavedVehicleToggleResponseSchema,
} from '../../../../schemas';
import { resolveFirestoreIdCandidates } from '../../../../utils/url-helpers';

type SaveCategory = 'vehicles' | 'clothing';
type ListingKind = 'vehicle' | 'clothing';

interface ResolvedListing {
  id: string;
  kind: ListingKind;
  sourceCollection: string;
}

type LoadListingResult =
  | { status: 'found'; listing: ResolvedListing }
  | { status: 'inactive' }
  | { status: 'not_found' };

function savedDocId(buyerUid: string, itemId: string): string {
  return `${buyerUid}_${itemId}`;
}

function parseCategory(raw: string | undefined): SaveCategory | null {
  if (raw === 'vehicles' || raw === 'clothing') return raw;
  return null;
}

function resolveItemIdCandidates(rawId: string): string[] {
  const candidates = new Set<string>([rawId]);

  for (const candidate of resolveFirestoreIdCandidates(rawId)) {
    candidates.add(candidate);
  }

  if (rawId.includes('-')) {
    const lastSegment = rawId.split('-').pop();
    if (lastSegment) {
      candidates.add(lastSegment);
    }
  }

  return [...candidates];
}

function collectionsForCategory(category: SaveCategory): Array<{
  name: string;
  kind: ListingKind;
}> {
  if (category === 'clothing') {
    return [
      { name: 'clothing_listings', kind: 'clothing' },
      { name: 'listings', kind: 'clothing' },
      { name: 'vehicles', kind: 'vehicle' },
    ];
  }

  return [
    { name: 'vehicles', kind: 'vehicle' },
    { name: 'listings', kind: 'vehicle' },
    { name: 'clothing_listings', kind: 'clothing' },
  ];
}

function isActiveListing(data: Record<string, unknown>): boolean {
  return data.status === 'active';
}

async function tryLoadFromCollection(
  collectionName: string,
  kind: ListingKind,
  candidateId: string
): Promise<LoadListingResult> {
  const doc = await db().collection(collectionName).doc(candidateId).get();

  if (!doc.exists) {
    return { status: 'not_found' };
  }

  const data = doc.data() as Record<string, unknown>;

  if (!isActiveListing(data)) {
    return { status: 'inactive' };
  }

  if (kind === 'vehicle') {
    const parsed = mapVehicleDoc(doc.id, data);
    if (!parsed.success) {
      return {
        status: 'found',
        listing: { id: doc.id, kind: 'vehicle', sourceCollection: collectionName },
      };
    }

    return {
      status: 'found',
      listing: { id: parsed.data.id, kind: 'vehicle', sourceCollection: collectionName },
    };
  }

  const parsed = mapClothingDoc(doc.id, data);
  if (!parsed.success) {
    return {
      status: 'found',
      listing: { id: doc.id, kind: 'clothing', sourceCollection: collectionName },
    };
  }

  return {
    status: 'found',
    listing: { id: parsed.data.id, kind: 'clothing', sourceCollection: collectionName },
  };
}

async function loadActiveListing(
  category: SaveCategory,
  rawId: string
): Promise<LoadListingResult> {
  const candidates = resolveItemIdCandidates(rawId);
  const collections = collectionsForCategory(category);

  for (const candidate of candidates) {
    for (const collection of collections) {
      const result = await tryLoadFromCollection(collection.name, collection.kind, candidate);
      if (result.status === 'found') {
        return result;
      }
      if (result.status === 'inactive') {
        return result;
      }
    }
  }

  return { status: 'not_found' };
}

function notFoundResponse() {
  return new Response(JSON.stringify({ error: 'Item not found in database.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

function inactiveResponse() {
  return new Response(JSON.stringify({ error: 'Item is no longer active.' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ params, request, cookies }) => {
  const category = parseCategory(params.category?.trim());
  const rawId = params.id?.trim();

  if (!category || !rawId) {
    return notFoundResponse();
  }

  const loadResult = await loadActiveListing(category, rawId);
  if (loadResult.status === 'inactive') {
    return inactiveResponse();
  }
  if (loadResult.status === 'not_found') {
    return notFoundResponse();
  }

  const listing = loadResult.listing;
  const firestoreId = listing.id;
  const savedCollection = listing.kind === 'vehicle' ? 'saved_vehicles' : 'saved_clothing';
  const StatusSchema =
    listing.kind === 'vehicle'
      ? SavedVehicleStatusResponseSchema
      : SavedClothingStatusResponseSchema;

  try {
    const session = await requireAuthenticated(request, cookies);
    const doc = await db()
      .collection(savedCollection)
      .doc(savedDocId(session.uid, firestoreId))
      .get();

    const response = StatusSchema.parse({ saved: doc.exists });
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const response = StatusSchema.parse({ saved: false });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error(`GET /api/${category}/${rawId}/save failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to load save status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const category = parseCategory(params.category?.trim());
  const rawId = params.id?.trim();

  if (!category || !rawId) {
    return notFoundResponse();
  }

  try {
    const session = await requireAuthenticated(request, cookies);
    requireVerificationTier(session, 'phone_verified');

    const loadResult = await loadActiveListing(category, rawId);
    if (loadResult.status === 'inactive') {
      return inactiveResponse();
    }
    if (loadResult.status === 'not_found') {
      return notFoundResponse();
    }

    const listing = loadResult.listing;
    const firestoreId = listing.id;
    const savedCollection = listing.kind === 'vehicle' ? 'saved_vehicles' : 'saved_clothing';
    const ToggleSchema =
      listing.kind === 'vehicle'
        ? SavedVehicleToggleResponseSchema
        : SavedClothingToggleResponseSchema;

    const docRef = db().collection(savedCollection).doc(savedDocId(session.uid, firestoreId));
    const existing = await docRef.get();

    if (existing.exists) {
      await docRef.delete();
      const response = ToggleSchema.parse({ saved: false });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const savedAt = new Date().toISOString();

    if (listing.kind === 'vehicle') {
      const savedVehicle = SavedVehicleSchema.parse({
        vehicleId: firestoreId,
        buyerUid: session.uid,
        savedAt,
      });
      await docRef.set(savedVehicle);
    } else {
      const savedClothing = SavedClothingSchema.parse({
        clothingId: firestoreId,
        buyerUid: session.uid,
        savedAt,
      });
      await docRef.set(savedClothing);
    }

    const response = ToggleSchema.parse({ saved: true });
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }

    if (error instanceof VerificationRequiredError) {
      return verificationRequiredResponse(error);
    }

    console.error(`POST /api/${category}/${rawId}/save failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to update save status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
