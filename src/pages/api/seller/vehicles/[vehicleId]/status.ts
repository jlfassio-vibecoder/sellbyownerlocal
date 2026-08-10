import type { APIRoute } from 'astro';
import { z } from 'zod';
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
  assertListingStatusTransition,
  InvalidListingStatusTransitionError,
  parseListingLifecycleStatus,
} from '../../../../../lib/listing-lifecycle';
import {
  ListingStatusUpdateSchema,
  VehicleResponseSchema,
} from '../../../../../schemas';

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = ListingStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fromStatus = parseListingLifecycleStatus(vehicle.status);
    if (!fromStatus) {
      return new Response(JSON.stringify({ error: 'Vehicle has invalid status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const toStatus = parsed.data.status;
    assertListingStatusTransition(fromStatus, toStatus);

    const statusChangedAt = new Date().toISOString();
    await ref.update({
      status: toStatus,
      previousStatus: fromStatus,
      statusChangedAt,
    });

    const updated = VehicleResponseSchema.parse({
      ...vehicle,
      status: toStatus,
    });

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof InvalidListingStatusTransitionError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid status transition',
          from: error.from,
          to: error.to,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse();
    }
    console.error(`PATCH /api/seller/vehicles/${vehicleId}/status failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to update vehicle status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
