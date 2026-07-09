import type { APIRoute } from 'astro';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../lib/auth';
import { mapAiGenerationError, logAiGenerationError } from '../../../lib/ai/ai-errors';
import { generateHeroImageBuffer, IMAGEN_MODEL } from '../../../lib/ai/generate-hero-image';
import { db, storageBucket } from '../../../lib/firebase-admin';
import { checkRateLimit } from '../../../lib/rate-limit';
import { decodeVin } from '../../../lib/vin-decoder';
import {
  GenerateHeroImageRequestSchema,
  VehicleResponseSchema,
  vinString,
} from '../../../schemas';

const AI_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 5 };

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isUniformBucketLevelAccessError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /uniform bucket-level access/i.test(message);
}

async function makeObjectPublicIfSupported(
  gcsFile: ReturnType<ReturnType<typeof storageBucket>['file']>
): Promise<void> {
  try {
    await gcsFile.makePublic();
  } catch (error) {
    if (isUniformBucketLevelAccessError(error)) {
      return;
    }
    throw error;
  }
}

async function uploadHeroImage(
  vehicleId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const filename = `vehicles/${vehicleId}/ai-hero/${Date.now()}-${randomUUID()}.${ext}`;
  const bucket = storageBucket();
  const gcsFile = bucket.file(filename);

  await gcsFile.save(buffer, {
    metadata: { contentType: mimeType },
  });
  await makeObjectPublicIfSupported(gcsFile);

  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireSeller(request, cookies);

    const rateLimit = checkRateLimit(`ai-hero:${session.uid}`, AI_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return jsonError('AI image rate limit exceeded. Try again later.', 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = GenerateHeroImageRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const vehicleId = parsed.data.vehicleId.trim();
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

    if (!vehicle.vin) {
      return jsonError('Vehicle has no VIN — run listing generation first', 400);
    }

    let decoded;
    try {
      decoded = await decodeVin(vinString.parse(vehicle.vin));
    } catch {
      return jsonError('Stored VIN could not be decoded', 400);
    }

    let url: string;
    try {
      const { buffer, mimeType } = await generateHeroImageBuffer(
        decoded,
        vehicle.specs.exteriorColor
      );
      url = await uploadHeroImage(vehicleId, buffer, mimeType);
    } catch (error) {
      logAiGenerationError('Hero image generation failed', error);
      await db()
        .collection('vehicles')
        .doc(vehicleId)
        .update({
          aiGeneration: {
            status: 'failed',
            source: 'vin',
            model: IMAGEN_MODEL,
            generatedAt: new Date().toISOString(),
          },
        })
        .catch(() => undefined);
      const mapped = mapAiGenerationError(error);
      return jsonError(mapped.message, mapped.status);
    }

    const images = [url, ...vehicle.images.filter((existing) => existing !== url)].slice(0, 30);

    await db()
      .collection('vehicles')
      .doc(vehicleId)
      .update({
        images,
        heroImageUrls: [url],
        aiGeneration: {
          status: 'complete',
          source: 'vin',
          model: IMAGEN_MODEL,
          generatedAt: new Date().toISOString(),
        },
      });

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('POST /api/ai/generate-hero-image failed', error);
    return jsonError('Failed to generate hero image', 500);
  }
};
