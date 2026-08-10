import type { APIRoute } from 'astro';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../../../lib/auth';
import { db } from '../../../../../lib/firebase-admin';
import {
  assertListingHardDeletable,
  deleteSavedFavoritesForListing,
  hardDeleteListingDocuments,
  ListingNotHardDeletableError,
} from '../../../../../lib/listing-hard-delete';
import { VehicleResponseSchema } from '../../../../../schemas';

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
  const vehicleId = params.vehicleId?.trim();

  if (!vehicleId) {
    return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const session = await requireSeller(request, cookies);

    const ref = db().collection('vehicles').doc(vehicleId);
    const doc = await ref.get();

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

    assertListingHardDeletable(vehicle.status);

    const deletedCount = await hardDeleteListingDocuments({
      category: 'vehicle',
      listingIds: [vehicleId],
    });

    const prunedSaveCount = await deleteSavedFavoritesForListing({
      category: 'vehicle',
      listingId: vehicleId,
    });

    return new Response(
      JSON.stringify({ success: true, deletedCount, prunedSaveCount }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    if (error instanceof ListingNotHardDeletableError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse();
    }
    console.error(`DELETE /api/seller/vehicles/${vehicleId}/hard-delete failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to delete vehicle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
