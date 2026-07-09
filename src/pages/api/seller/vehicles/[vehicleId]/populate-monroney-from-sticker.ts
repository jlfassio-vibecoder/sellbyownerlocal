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
import { mapAiGenerationError, logAiGenerationError } from '../../../../../lib/ai/ai-errors';
import {
  GEMINI_TEXT_MODEL,
  generateMonroneyFromSticker,
} from '../../../../../lib/ai/generate-monroney-from-sticker';
import { db } from '../../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { fetchFederalMonroneyData } from '../../../../../lib/federal-data';
import { enrichMonroneyFromVinDecode } from '../../../../../lib/monroney-style-line';
import { checkRateLimit } from '../../../../../lib/rate-limit';
import {
  extractBase64FromDataUri,
  extractMimeTypeFromDataUri,
} from '../../../../../lib/sticker-file';
import { uploadVehicleFile } from '../../../../../lib/storage-upload';
import { decodeVin } from '../../../../../lib/vin-decoder';
import {
  MonroneySchema,
  PopulateMonroneyFromStickerRequestSchema,
  PopulateMonroneyFromStickerResponseSchema,
  VehicleResponseSchema,
  type Monroney,
} from '../../../../../schemas';
import { AiMonroneyLenientSchema } from '../../../../../lib/ai/ai-listing-content-schema';

const MONRONEY_STICKER_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 10 };

const PARTIAL_SUCCESS_MESSAGE =
  'Saved available sticker data. Some fields did not pass validation — review the preview.';

type AiMonroneyLenient = z.infer<typeof AiMonroneyLenientSchema>;

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function resolveMonroneyFromAi(
  raw: AiMonroneyLenient,
  decoded: Awaited<ReturnType<typeof decodeVin>> | undefined,
  federal: Awaited<ReturnType<typeof fetchFederalMonroneyData>> | undefined
): Monroney | undefined {
  if (
    raw.baseMsrp == null ||
    raw.destinationCharge == null ||
    raw.totalMsrp == null ||
    !raw.options ||
    !raw.standardEquipment
  ) {
    const minimal = MonroneySchema.safeParse({
      ...(raw.baseMsrp != null ? { baseMsrp: raw.baseMsrp } : {}),
      ...(raw.destinationCharge != null ? { destinationCharge: raw.destinationCharge } : {}),
      ...(raw.totalMsrp != null ? { totalMsrp: raw.totalMsrp } : {}),
      ...(raw.options ? { options: raw.options } : {}),
      ...(raw.standardEquipment ? { standardEquipment: raw.standardEquipment } : {}),
      ...(raw.warranty ? { warranty: raw.warranty } : {}),
      ...(raw.partsContent ? { partsContent: raw.partsContent } : {}),
    });
    return minimal.success ? minimal.data : undefined;
  }

  const core = {
    baseMsrp: raw.baseMsrp,
    destinationCharge: raw.destinationCharge,
    totalMsrp: raw.totalMsrp,
    options: raw.options,
    standardEquipment: raw.standardEquipment,
    ...(raw.warranty ? { warranty: raw.warranty } : {}),
    ...(raw.partsContent ? { partsContent: raw.partsContent } : {}),
  };

  if (decoded && federal) {
    const enriched = enrichMonroneyFromVinDecode(decoded, core, federal);
    const parsed = MonroneySchema.safeParse(enriched);
    if (parsed.success) {
      return parsed.data;
    }
    console.warn(
      'Enriched monroney from sticker failed validation; saving core fields only',
      z.flattenError(parsed.error)
    );
  }

  const minimal = MonroneySchema.safeParse(core);
  return minimal.success ? minimal.data : undefined;
}

export const POST: APIRoute = async ({ request, cookies, params }) => {
  const vehicleId = params.vehicleId?.trim();

  if (!vehicleId) {
    return jsonError('Vehicle not found', 404);
  }

  try {
    const session = await requireSeller(request, cookies);

    const rateLimit = checkRateLimit(
      `monroney-sticker:${session.uid}`,
      MONRONEY_STICKER_RATE_LIMIT
    );
    if (!rateLimit.allowed) {
      return jsonError('Rate limit exceeded. Try again later.', 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = PopulateMonroneyFromStickerRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
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

    const vinToDecode = parsed.data.vin ?? vehicle.vin;
    let decoded: Awaited<ReturnType<typeof decodeVin>> | undefined;
    let federal: Awaited<ReturnType<typeof fetchFederalMonroneyData>> | undefined;

    if (vinToDecode) {
      try {
        decoded = await decodeVin(vinToDecode);
        federal = await fetchFederalMonroneyData(decoded);
      } catch {
        // VIN optional for sticker-only; proceed without federal enrichment
      }
    }

    let aiResult;
    try {
      aiResult = await generateMonroneyFromSticker(parsed.data.stickerFile, decoded);
    } catch (error) {
      logAiGenerationError('populate-monroney-from-sticker generation failed', error);
      const mapped = mapAiGenerationError(error);
      return jsonError(mapped.message, mapped.status);
    }

    const contentType = extractMimeTypeFromDataUri(parsed.data.stickerFile);
    const stickerBuffer = Buffer.from(
      extractBase64FromDataUri(parsed.data.stickerFile),
      'base64'
    );
    const originalStickerUrl = await uploadVehicleFile({
      vehicleId,
      buffer: stickerBuffer,
      contentType,
      folder: 'original_sticker',
    });

    const monroney = resolveMonroneyFromAi(aiResult.monroney, decoded, federal);
    if (!monroney) {
      return jsonError('Could not extract usable window sticker data from the upload', 422);
    }

    const generatedAt = new Date().toISOString();
    const update: Record<string, unknown> = {
      monroney,
      originalStickerUrl,
      'documents.windowSticker': FieldValue.delete(),
      aiGeneration: {
        status: aiResult.partial ? 'partial' : 'text_complete',
        source: 'sticker',
        model: GEMINI_TEXT_MODEL,
        generatedAt,
      },
    };

    if (decoded?.vin) {
      update.vin = decoded.vin;
    }

    await db().collection('vehicles').doc(vehicleId).update(update);

    const response = PopulateMonroneyFromStickerResponseSchema.parse({
      vehicleId,
      enriched: Boolean(decoded && federal),
      styleLine: monroney.styleLine,
      monroney,
      ...(aiResult.partial
        ? {
            partial: true,
            message: PARTIAL_SUCCESS_MESSAGE,
          }
        : {
            message: 'Site window sticker generated from upload.',
          }),
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('POST populate-monroney-from-sticker failed', error);
    return jsonError('Failed to generate window sticker from upload', 500);
  }
};
