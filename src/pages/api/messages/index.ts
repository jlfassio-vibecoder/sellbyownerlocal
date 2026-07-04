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
import { mapMessageDoc } from '../../../lib/messages';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { MessageCreateSchema, VehicleResponseSchema } from '../../../schemas';

const MESSAGE_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 20,
};

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
          details: parsed.error.flatten().fieldErrors,
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

    const timestamp = new Date().toISOString();
    const docRef = await db().collection('messages').add({
      sessionId,
      vehicleId,
      sender,
      content,
      timestamp,
      isRead: 0,
    });

    const messageParsed = mapMessageDoc(docRef.id, {
      sessionId,
      vehicleId,
      sender,
      content,
      timestamp,
      isRead: 0,
    });

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
