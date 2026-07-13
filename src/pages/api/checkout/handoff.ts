import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  forbiddenResponse,
  requireAuthenticated,
  unauthorizedResponse,
} from '../../../lib/auth';
import { generateBrokerCheckoutUrl } from '../../../lib/broker-checkout';
import { auth, db } from '../../../lib/firebase-admin';
import { VehicleResponseSchema } from '../../../schemas';

const HandoffBodySchema = z.object({
  vehicleId: z.string().trim().min(1),
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function resolveAuthEmail(
  uid: string,
  role: 'Buyer' | 'Seller'
): Promise<{ email: string } | Response> {
  try {
    const user = await auth().getUser(uid);
    const email = user.email?.trim();
    if (!email) {
      return jsonError(`${role} account is missing an email address`, 422);
    }
    return { email };
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    if (code === 'auth/user-not-found') {
      return jsonError(`${role} account not found`, 404);
    }
    throw error;
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireAuthenticated(request, cookies);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = HandoffBodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation failed', 400);
    }

    const { vehicleId } = parsed.data;

    const snap = await db().collection('vehicles').doc(vehicleId).get();
    if (!snap.exists) {
      return jsonError('Vehicle not found', 404);
    }

    const vehicleParsed = VehicleResponseSchema.safeParse({
      id: snap.id,
      ...snap.data(),
    });
    if (!vehicleParsed.success) {
      return jsonError('Vehicle not found', 404);
    }

    const vehicle = vehicleParsed.data;

    if (session.uid === vehicle.sellerId) {
      throw new ForbiddenError('Owners cannot start checkout on their own listing');
    }

    const sellerResult = await resolveAuthEmail(vehicle.sellerId, 'Seller');
    if (sellerResult instanceof Response) return sellerResult;

    const buyerResult = await resolveAuthEmail(session.uid, 'Buyer');
    if (buyerResult instanceof Response) return buyerResult;

    const redirectUrl = generateBrokerCheckoutUrl(
      vehicle,
      buyerResult.email,
      sellerResult.email
    );

    return new Response(JSON.stringify({ redirectUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(error.message);
    }
    console.error('POST /api/checkout/handoff failed', error);
    return jsonError('Failed to start secure checkout', 500);
  }
};
