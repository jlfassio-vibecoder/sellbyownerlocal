import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../lib/auth';
import { mapAiGenerationError, logAiGenerationError } from '../../../lib/ai/ai-errors';
import { generateHighlights } from '../../../lib/ai/generate-highlights';
import { db } from '../../../lib/firebase-admin';
import { checkRateLimit } from '../../../lib/rate-limit';
import {
  GenerateHighlightsRequestSchema,
  GenerateHighlightsResponseSchema,
  VehicleResponseSchema,
} from '../../../schemas';

const AI_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 5 };

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireSeller(request, cookies);

    const rateLimit = checkRateLimit(`ai-highlights:${session.uid}`, AI_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return jsonError('AI highlights rate limit exceeded. Try again later.', 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = GenerateHighlightsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const vehicleId = parsed.data.vehicleId;
    const doc = await db().collection('vehicles').doc(vehicleId).get();

    if (!doc.exists) {
      return jsonError('Vehicle not found', 404);
    }

    const raw = { id: doc.id, ...doc.data() };
    const vehicleParsed = VehicleResponseSchema.safeParse(raw);

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

    if (!vehicle.monroney && !vehicle.marketValuation) {
      return jsonError(
        'Save Monroney window sticker data or run Deep Market Analysis before generating highlights.',
        400
      );
    }

    let result;
    try {
      result = await generateHighlights(vehicle);
    } catch (error) {
      logAiGenerationError('Highlights generation failed', error);
      const mapped = mapAiGenerationError(error);
      return jsonError(mapped.message, mapped.status);
    }

    const response = GenerateHighlightsResponseSchema.parse({
      highlights: result.highlights,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('POST /api/ai/generate-highlights failed', error);
    return jsonError('Failed to generate highlights', 500);
  }
};
