import type { APIRoute } from 'astro';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../lib/auth';
import { mapAiGenerationError, logAiGenerationError } from '../../../lib/ai/ai-errors';
import { extractServiceHistory } from '../../../lib/ai/extract-service-history';
import { resolveHistoryReportUrls } from '../../../lib/history-report-urls';
import { db } from '../../../lib/firebase-admin';
import { checkRateLimit } from '../../../lib/rate-limit';
import {
  ExtractServiceHistoryRequestSchema,
  ExtractServiceHistoryResponseSchema,
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

    const rateLimit = checkRateLimit(`ai-service-history:${session.uid}`, AI_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return jsonError('AI service history rate limit exceeded. Try again later.', 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = ExtractServiceHistoryRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
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

    if (resolveHistoryReportUrls(vehicle).length === 0) {
      return jsonError('Upload a history report before extracting service records.', 400);
    }

    let result;
    try {
      result = await extractServiceHistory(vehicle);
    } catch (error) {
      logAiGenerationError('Service history extraction failed', error);
      const mapped = mapAiGenerationError(error);
      return jsonError(mapped.message, mapped.status);
    }

    const response = ExtractServiceHistoryResponseSchema.parse({
      records: result.records,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('POST /api/ai/extract-service-history failed', error);
    return jsonError('Failed to extract service history', 500);
  }
};
