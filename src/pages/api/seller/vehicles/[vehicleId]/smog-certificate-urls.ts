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
import { VehicleResponseSchema, httpHttpsUrl } from '../../../../../schemas';

const UpdateSmogCertificateUrlsSchema = z.object({
  urls: z.array(httpHttpsUrl),
});

export const PUT: APIRoute = async ({ request, cookies, params }) => {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = UpdateSmogCertificateUrlsSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Validation failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db().collection('vehicles').doc(vehicleId).update({
      smogCertificateUrls: parsed.data.urls,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error(`PUT /api/seller/vehicles/${vehicleId}/smog-certificate-urls failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to update smog certificate URLs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
