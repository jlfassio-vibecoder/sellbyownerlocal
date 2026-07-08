import type { APIRoute } from 'astro';
import {
  AuthError,
  requireSeller,
  requireVerificationTier,
  unauthorizedResponse,
  verificationRequiredResponse,
  VerificationRequiredError,
} from '../../../../lib/auth';
import { db } from '../../../../lib/firebase-admin';
import {
  SavedVehicleSchema,
  SavedVehicleStatusResponseSchema,
  SavedVehicleToggleResponseSchema,
  VehicleResponseSchema,
} from '../../../../schemas';

function savedVehicleDocId(buyerUid: string, vehicleId: string): string {
  return `${buyerUid}_${vehicleId}`;
}

async function loadActiveVehicle(vehicleId: string) {
  const doc = await db().collection('vehicles').doc(vehicleId).get();

  if (!doc.exists) {
    return null;
  }

  const parsed = VehicleResponseSchema.safeParse({ id: doc.id, ...doc.data() });
  if (!parsed.success || parsed.data.status !== 'active') {
    return null;
  }

  return parsed.data;
}

export const GET: APIRoute = async ({ params, request, cookies }) => {
  const vehicleId = params.vehicleId?.trim();

  if (!vehicleId) {
    return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const vehicle = await loadActiveVehicle(vehicleId);
  if (!vehicle) {
    return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const session = await requireSeller(request, cookies);
    const doc = await db()
      .collection('saved_vehicles')
      .doc(savedVehicleDocId(session.uid, vehicleId))
      .get();

    const response = SavedVehicleStatusResponseSchema.parse({ saved: doc.exists });
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const response = SavedVehicleStatusResponseSchema.parse({ saved: false });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('GET /api/vehicles/[vehicleId]/save failed', error);
    return new Response(JSON.stringify({ error: 'Failed to load save status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const vehicleId = params.vehicleId?.trim();

  if (!vehicleId) {
    return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const session = await requireSeller(request, cookies);
    requireVerificationTier(session, 'phone_verified');

    const vehicle = await loadActiveVehicle(vehicleId);
    if (!vehicle) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const docRef = db()
      .collection('saved_vehicles')
      .doc(savedVehicleDocId(session.uid, vehicleId));
    const existing = await docRef.get();

    if (existing.exists) {
      await docRef.delete();
      const response = SavedVehicleToggleResponseSchema.parse({ saved: false });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const savedAt = new Date().toISOString();
    const savedVehicle = SavedVehicleSchema.parse({
      vehicleId,
      buyerUid: session.uid,
      savedAt,
    });

    await docRef.set(savedVehicle);

    const response = SavedVehicleToggleResponseSchema.parse({ saved: true });
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

    console.error('POST /api/vehicles/[vehicleId]/save failed', error);
    return new Response(JSON.stringify({ error: 'Failed to update save status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
