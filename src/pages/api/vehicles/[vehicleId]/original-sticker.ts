import type { APIRoute } from 'astro';
import { db } from '../../../../lib/firebase-admin';
import { resolveOriginalStickerUrl } from '../../../../lib/original-sticker-url';
import { isPdfUrl } from '../../../../lib/pdf-url';
import { streamOwnedVehicleFile } from '../../../../lib/vehicle-file-proxy';
import { VehicleResponseSchema } from '../../../../schemas';

export const GET: APIRoute = async ({ params }) => {
  const vehicleId = params.vehicleId?.trim();

  if (!vehicleId) {
    return new Response('Vehicle not found', { status: 404 });
  }

  try {
    const doc = await db().collection('vehicles').doc(vehicleId).get();

    if (!doc.exists) {
      return new Response('Vehicle not found', { status: 404 });
    }

    const parsed = VehicleResponseSchema.safeParse({ id: doc.id, ...doc.data() });
    if (!parsed.success) {
      return new Response('Vehicle not found', { status: 404 });
    }

    const stickerUrl = resolveOriginalStickerUrl(parsed.data);
    if (!stickerUrl) {
      return new Response('Original window sticker not found', { status: 404 });
    }

    if (!isPdfUrl(stickerUrl)) {
      return streamOwnedVehicleFile(vehicleId, stickerUrl, {
        fallbackContentType: 'application/octet-stream',
        iframeInlinePdf: false,
      });
    }

    return streamOwnedVehicleFile(vehicleId, stickerUrl, {
      fallbackContentType: 'application/pdf',
      iframeInlinePdf: true,
    });
  } catch (error) {
    console.error(`GET /api/vehicles/${vehicleId}/original-sticker failed`, error);
    return new Response('Failed to load window sticker', { status: 500 });
  }
};
