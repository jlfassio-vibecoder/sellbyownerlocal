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
import { fetchFederalMonroneyData } from '../../../../../lib/federal-data';
import {
  buildMonroneyFactorySpecs,
  buildMonroneyStyleLineFromVinDecode,
  enrichMonroneyFromVinDecode,
} from '../../../../../lib/monroney-style-line';
import { checkRateLimit } from '../../../../../lib/rate-limit';
import { decodeVin } from '../../../../../lib/vin-decoder';
import {
  PopulateMonroneyFromVinRequestSchema,
  PopulateMonroneyFromVinResponseSchema,
  VehicleResponseSchema,
} from '../../../../../schemas';

const MONRONEY_VIN_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 30 };

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies, params }) => {
  const vehicleId = params.vehicleId?.trim();

  if (!vehicleId) {
    return jsonError('Vehicle not found', 404);
  }

  try {
    const session = await requireSeller(request, cookies);

    const rateLimit = checkRateLimit(`monroney-vin:${session.uid}`, MONRONEY_VIN_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return jsonError('Rate limit exceeded. Try again later.', 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = PopulateMonroneyFromVinRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const doc = await db().collection('vehicles').doc(vehicleId).get();

    if (!doc.exists) {
      return jsonError('Vehicle not found', 404);
    }

    const vehicleParsed = VehicleResponseSchema.safeParse({ id: doc.id, ...doc.data() });
    if (!vehicleParsed.success) {
      return jsonError('Vehicle not found', 404);
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

    let decoded;
    try {
      decoded = await decodeVin(parsed.data.vin);
    } catch {
      return jsonError('VIN could not be decoded', 404);
    }

    const existingMonroney = vehicle.monroney;
    const federal = await fetchFederalMonroneyData(decoded);

    if (existingMonroney) {
      const monroney = enrichMonroneyFromVinDecode(decoded, existingMonroney, federal);

      await db().collection('vehicles').doc(vehicleId).update({
        vin: decoded.vin,
        monroney,
      });

      const response = PopulateMonroneyFromVinResponseSchema.parse({
        vehicleId,
        vin: decoded.vin,
        enriched: true,
        styleLine: monroney.styleLine,
        monroney,
        message: 'Window sticker updated from VIN factory data.',
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db().collection('vehicles').doc(vehicleId).update({
      vin: decoded.vin,
    });

    const factoryPreview = {
      styleLine: buildMonroneyStyleLineFromVinDecode(decoded),
      factorySpecs: buildMonroneyFactorySpecs(decoded),
      assembly: {
        plant: decoded.plant,
        country: decoded.plantCountry,
      },
    };

    const response = PopulateMonroneyFromVinResponseSchema.parse({
      vehicleId,
      vin: decoded.vin,
      enriched: false,
      needsFullPopulate: true,
      factoryPreview,
      message:
        'VIN saved. Run Populate full listing via VIN for MSRP, options, and standard equipment.',
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('POST populate-monroney-from-vin failed', error);
    return jsonError('Failed to populate window sticker from VIN', 500);
  }
};
