import type { APIRoute } from 'astro';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  requireDealer,
  requireSeller,
  unauthorizedResponse,
} from '../../../lib/auth';
import { aiContentToFormFields, buildVehicleFromAiContent } from '../../../lib/ai/ai-output-mapper';
import { GEMINI_TEXT_MODEL, generateListingContent } from '../../../lib/ai/generate-listing-content';
import { auth, db } from '../../../lib/firebase-admin';
import { checkRateLimit } from '../../../lib/rate-limit';
import { decodeVin } from '../../../lib/vin-decoder';
import {
  GenerateListingRequestSchema,
  GenerateListingResponseSchema,
  VehicleSchema,
} from '../../../schemas';

const AI_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 5 };

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function resolveSellerName(uid: string, email?: string): Promise<string> {
  try {
    const user = await auth().getUser(uid);
    return user.displayName?.trim() || email?.split('@')[0] || 'Seller';
  } catch {
    return email?.split('@')[0] || 'Seller';
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireSeller(request, cookies);

    const rateLimit = checkRateLimit(`ai-generate:${session.uid}`, AI_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return jsonError('AI generation rate limit exceeded. Try again later.', 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = GenerateListingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { vin, vehicleId, prospect } = parsed.data;
    const isDealerCreate = Boolean(prospect && !vehicleId);
    const isSellerPopulate = Boolean(vehicleId);

    if (!isDealerCreate && !isSellerPopulate) {
      return jsonError('Provide vehicleId (seller) or prospect without vehicleId (dealer create)', 400);
    }

    if (isDealerCreate) {
      try {
        await requireDealer(request, cookies);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return forbiddenResponse('Dealer access required');
        }
        throw error;
      }
    }

    let decoded;
    try {
      decoded = await decodeVin(vin);
    } catch {
      return jsonError('VIN could not be decoded', 404);
    }

    let content;
    try {
      content = await generateListingContent(decoded, prospect);
    } catch (error) {
      console.error('AI listing generation failed', error);
      return jsonError('AI listing generation failed. Please retry.', 502);
    }

    const generatedAt = new Date().toISOString();
    const aiGeneration = {
      status: 'text_complete' as const,
      source: 'vin' as const,
      model: GEMINI_TEXT_MODEL,
      generatedAt,
    };

    const formFields = aiContentToFormFields(content);
    let resolvedVehicleId: string;

    if (isSellerPopulate) {
      const trimmedVehicleId = vehicleId!.trim();
      const doc = await db().collection('vehicles').doc(trimmedVehicleId).get();

      if (!doc.exists) {
        return jsonError('Vehicle not found', 404);
      }

      const sellerId = doc.data()?.sellerId;
      if (typeof sellerId !== 'string') {
        return jsonError('Vehicle not found', 404);
      }

      try {
        assertVehicleOwner(session.uid, sellerId);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return forbiddenResponse();
        }
        throw error;
      }

      await db().collection('vehicles').doc(trimmedVehicleId).update({
        monroney: content.monroney,
        aiGeneration,
        vin: decoded.vin,
      });

      resolvedVehicleId = trimmedVehicleId;
    } else {
      const sellerName = await resolveSellerName(session.uid, session.email);
      const vehicleData = buildVehicleFromAiContent({
        decoded,
        content,
        sellerId: session.uid,
        sellerName,
        prospect,
        aiGeneration,
      });

      const vehicleParsed = VehicleSchema.safeParse(vehicleData);
      if (!vehicleParsed.success) {
        console.error('Generated vehicle failed validation', vehicleParsed.error.flatten());
        return jsonError('AI output failed validation', 502);
      }

      const docRef = await db().collection('vehicles').add(vehicleParsed.data);
      resolvedVehicleId = docRef.id;
    }

    const response = GenerateListingResponseSchema.parse({
      vehicleId: resolvedVehicleId,
      formFields,
      monroney: content.monroney,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('POST /api/ai/generate-listing failed', error);
    return jsonError('Failed to generate listing', 500);
  }
};
