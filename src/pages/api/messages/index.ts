import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  getOptionalSession,
  requireSeller,
  unauthorizedResponse,
} from '../../../lib/auth';
import { db } from '../../../lib/firebase-admin';
import { mapMessageDoc } from '../../../lib/messages';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { MessageCreateSchema, VehicleResponseSchema } from '../../../schemas';

const MESSAGE_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 20,
};

async function resolveThreadBuyerUid(
  sessionId: string,
  vehicleId: string
): Promise<string | undefined> {
  const snapshot = await db()
    .collection('messages')
    .where('sessionId', '==', sessionId)
    .where('vehicleId', '==', vehicleId)
    .orderBy('timestamp', 'asc')
    .limit(25)
    .get();

  // Prefer the most recent message that already has buyerUid (scan from the end).
  for (let i = snapshot.docs.length - 1; i >= 0; i -= 1) {
    const buyerUid = snapshot.docs[i]?.data().buyerUid;
    if (typeof buyerUid === 'string' && buyerUid.trim()) {
      return buyerUid.trim();
    }
  }

  return undefined;
}

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = MessageCreateSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { sessionId, vehicleId, sender, content } = parsed.data;

    if (sender === 'buyer') {
      const clientIp = getClientIp(request, clientAddress);
      const rateLimit = checkRateLimit(`messages:${clientIp}`, MESSAGE_RATE_LIMIT);

      if (!rateLimit.allowed) {
        const retryAfterSeconds = Math.ceil(
          (rateLimit.retryAfterMs ?? MESSAGE_RATE_LIMIT.windowMs) / 1000
        );
        return new Response(
          JSON.stringify({ error: 'Too many messages. Please try again later.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfterSeconds),
            },
          }
        );
      }
    }

    const vehicleDoc = await db().collection('vehicles').doc(vehicleId).get();

    if (!vehicleDoc.exists) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const vehicleRaw = { id: vehicleDoc.id, ...vehicleDoc.data() };
    const vehicleParsed = VehicleResponseSchema.safeParse(vehicleRaw);

    if (!vehicleParsed.success) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (vehicleParsed.data.inventorySource === 'dealer_comp') {
      return new Response(
        JSON.stringify({ error: 'Messaging is not available for dealer comparable listings' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (sender === 'seller') {
      try {
        const session = await requireSeller(request, cookies);
        assertVehicleOwner(session.uid, vehicleParsed.data.sellerId);
      } catch (error) {
        if (error instanceof AuthError) {
          return unauthorizedResponse();
        }
        if (error instanceof ForbiddenError) {
          return forbiddenResponse();
        }
        throw error;
      }
    }

    let buyerUid: string | undefined;
    if (sender === 'buyer') {
      const authSession = await getOptionalSession(request, cookies);
      if (authSession?.uid) {
        buyerUid = authSession.uid;
      }
    } else {
      buyerUid = await resolveThreadBuyerUid(sessionId, vehicleId);
    }

    const timestamp = new Date().toISOString();
    const messageData: Record<string, unknown> = {
      sessionId,
      vehicleId,
      sender,
      content,
      timestamp,
      isRead: 0,
    };
    if (buyerUid) {
      messageData.buyerUid = buyerUid;
    }

    const docRef = await db().collection('messages').add(messageData);

    const messageParsed = mapMessageDoc(docRef.id, messageData);

    if (!messageParsed.success) {
      return new Response(JSON.stringify({ error: 'Failed to create message' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(messageParsed.data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('POST /api/messages failed', error);
    return new Response(JSON.stringify({ error: 'Failed to send message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
