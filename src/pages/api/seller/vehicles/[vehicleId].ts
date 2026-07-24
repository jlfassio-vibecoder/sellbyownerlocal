import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../../lib/auth';
import { db, storageBucket } from '../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { formStateToVehiclePatch } from '../../../../lib/vehicle-form-mapper';
import { buildPromotedComparablePatch } from '../../../../lib/build-vehicle-from-comparable';
import { deleteStorageObjectBestEffort } from '../../../../lib/storage-upload';
import { parseVehicleOwnedStorageObjectPath } from '../../../../lib/storage-url';
import {
  VehicleDashboardUpdateSchema,
  VehicleFormStateSchema,
  VehicleResponseSchema,
} from '../../../../schemas';

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  const vehicleId = params.vehicleId?.trim();

  if (!vehicleId) {
    return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const session = await requireSeller(request, cookies);

    const doc = await db().collection('vehicles').doc(vehicleId).get();

    if (!doc.exists) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const raw = { id: doc.id, ...doc.data() };
    const vehicleParsed = VehicleResponseSchema.safeParse(raw);

    if (!vehicleParsed.success) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const vehicle = vehicleParsed.data;

    try {
      assertVehicleOwner(session.uid, vehicle.sellerId);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return forbiddenResponse();
      }
      throw error;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formParsed = VehicleFormStateSchema.safeParse(body);

    if (!formParsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(formParsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let patch;
    try {
      patch = formStateToVehiclePatch(formParsed.data, vehicle);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid form data';
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const patchParsed = VehicleDashboardUpdateSchema.safeParse(patch);

    if (!patchParsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(patchParsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const firestoreUpdate: Record<string, unknown> = { ...patchParsed.data };
    const listingTitle = firestoreUpdate.listingTitle;
    if (listingTitle === null || listingTitle === '') {
      firestoreUpdate.listingTitle = FieldValue.delete();
    } else if (typeof listingTitle === 'string') {
      const trimmed = listingTitle.trim();
      firestoreUpdate.listingTitle = trimmed ? trimmed : FieldValue.delete();
    }

    if (
      Array.isArray(firestoreUpdate.galleryPhotos) &&
      firestoreUpdate.galleryPhotos.length === 0
    ) {
      firestoreUpdate.galleryPhotos = FieldValue.delete();
    }

    await db().collection('vehicles').doc(vehicleId).update(firestoreUpdate);

    // Best-effort: delete GCS objects removed from master images (never fail the PATCH).
    try {
      const previousImages = vehicle.images ?? [];
      const nextImages = new Set(patchParsed.data.images ?? []);
      const removed = previousImages.filter((url) => !nextImages.has(url));
      const bucketName = storageBucket().name;

      for (const url of removed) {
        const objectPath = parseVehicleOwnedStorageObjectPath(url, vehicleId, bucketName);
        if (objectPath) {
          await deleteStorageObjectBestEffort(objectPath, { vehicleId });
        }
      }
    } catch (cleanupError) {
      console.error(
        `PATCH /api/seller/vehicles/${vehicleId} storage cleanup failed`,
        cleanupError
      );
    }

    const comparables = patchParsed.data.marketValuation?.comparables ?? [];
    const syncWrites = await Promise.all(
      comparables.map(async (comparable) => {
        const promotedId = comparable.promotedVehicleId?.trim();
        if (!promotedId) return null;

        const promotedPatch = buildPromotedComparablePatch(comparable);
        if (!promotedPatch) return null;

        const promotedDoc = await db().collection('vehicles').doc(promotedId).get();
        if (!promotedDoc.exists) return null;

        const promotedData = promotedDoc.data() as Record<string, unknown> | undefined;
        if (
          promotedData?.inventorySource !== 'dealer_comp' ||
          promotedData?.parentVehicleId !== vehicleId ||
          promotedData?.sellerId !== vehicle.sellerId
        ) {
          return null;
        }

        return db().collection('vehicles').doc(promotedId).update(promotedPatch);
      })
    );

    await Promise.all(syncWrites.filter(Boolean));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error(`PATCH /api/seller/vehicles/${vehicleId} failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to update vehicle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
