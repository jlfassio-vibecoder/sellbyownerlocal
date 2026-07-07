import type { APIRoute } from 'astro';
import { db } from '../../../../lib/firebase-admin';
import { isAllowedSmogCertificateUrl } from '../../../../lib/smog-certificate-url';
import { isPdfUrl } from '../../../../lib/pdf-url';
import { streamOwnedVehicleFile } from '../../../../lib/vehicle-file-proxy';
import { VehicleResponseSchema } from '../../../../schemas';

export const GET: APIRoute = async ({ params, url }) => {
  const vehicleId = params.vehicleId?.trim();
  const fileUrl = url.searchParams.get('url')?.trim();

  if (!vehicleId) {
    return new Response('Vehicle not found', { status: 404 });
  }

  if (!fileUrl) {
    return new Response('url query parameter is required', { status: 400 });
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

    if (!isAllowedSmogCertificateUrl(parsed.data, fileUrl)) {
      return new Response('Smog certificate not found', { status: 404 });
    }

    return streamOwnedVehicleFile(vehicleId, fileUrl, {
      allowedSubpaths: ['smog_certificate/', 'documents/'],
      fallbackContentType: 'application/octet-stream',
      iframeInlinePdf: isPdfUrl(fileUrl),
    });
  } catch (error) {
    console.error(`GET /api/vehicles/${vehicleId}/smog-certificate failed`, error);
    return new Response('Failed to load smog certificate', { status: 500 });
  }
};
