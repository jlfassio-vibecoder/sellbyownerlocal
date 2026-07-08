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
import { getListingAnalytics } from '../../../../../lib/listing-analytics';
import { ListingAnalyticsRangeSchema, VehicleResponseSchema } from '../../../../../schemas';

export const GET: APIRoute = async ({ params, request, cookies, url }) => {
  const vehicleId = params.vehicleId?.trim();

  if (!vehicleId) {
    return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rangeParsed = ListingAnalyticsRangeSchema.safeParse(url.searchParams.get('range') ?? '30d');
  if (!rangeParsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid range parameter' }), {
      status: 400,
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

    const vehicleParsed = VehicleResponseSchema.safeParse({ id: doc.id, ...doc.data() });
    if (!vehicleParsed.success) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      assertVehicleOwner(session.uid, vehicleParsed.data.sellerId);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return forbiddenResponse();
      }
      throw error;
    }

    const analytics = await getListingAnalytics(vehicleId, rangeParsed.data);

    return new Response(JSON.stringify(analytics), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }

    console.error('GET /api/seller/vehicles/[vehicleId]/analytics failed', error);
    return new Response(JSON.stringify({ error: 'Failed to load analytics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
