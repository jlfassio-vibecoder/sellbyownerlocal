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
import { VehicleResponseSchema } from '../../../../../schemas';

export const POST: APIRoute = async ({ request, cookies, params, url }) => {
  const sessionId = params.sessionId?.trim();

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const vehicleId = url.searchParams.get('vehicleId')?.trim();

  if (!vehicleId) {
    return new Response(JSON.stringify({ error: 'vehicleId query parameter is required' }), {
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

    const raw = { id: doc.id, ...doc.data() };
    const vehicleParsed = VehicleResponseSchema.safeParse(raw);

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

    const snapshot = await db()
      .collection('messages')
      .where('sessionId', '==', sessionId)
      .where('vehicleId', '==', vehicleId)
      .where('sender', '==', 'buyer')
      .get();

    const BATCH_SIZE = 500;
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      const batch = db().batch();
      snapshot.docs.slice(i, i + BATCH_SIZE).forEach((messageDoc) => {
        batch.update(messageDoc.ref, { isRead: 1 });
      });
      await batch.commit();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error(`POST /api/seller/messages/${sessionId}/read failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to mark messages as read' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
