import type { APIRoute } from 'astro';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../lib/auth';
import { db } from '../../../lib/firebase-admin';
import { mapMessageDoc, toConversations } from '../../../lib/messages';
import { VehicleResponseSchema } from '../../../schemas';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const session = await requireSeller(request, cookies);
    const vehicleId = url.searchParams.get('vehicleId')?.trim();

    if (!vehicleId) {
      return new Response(JSON.stringify({ error: 'vehicleId query parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
      .where('vehicleId', '==', vehicleId)
      .orderBy('timestamp', 'desc')
      .get();

    const messages = snapshot.docs.flatMap((messageDoc) => {
      const parsed = mapMessageDoc(messageDoc.id, messageDoc.data() as Record<string, unknown>);
      return parsed.success ? [parsed.data] : [];
    });

    const conversations = toConversations(messages);

    return new Response(JSON.stringify(conversations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('GET /api/seller/conversations failed', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch conversations' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
