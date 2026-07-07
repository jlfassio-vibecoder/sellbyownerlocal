import type { APIRoute } from 'astro';
import { db } from '../../../../lib/firebase-admin';
import { resolveKbbReportUrl } from '../../../../lib/kbb-report-url';
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

    const kbbUrl = resolveKbbReportUrl(parsed.data);
    if (!kbbUrl) {
      return new Response('KBB report not found', { status: 404 });
    }

    return streamOwnedVehicleFile(vehicleId, kbbUrl, {
      allowedSubpaths: ['kbb_report/', 'documents/'],
      fallbackContentType: 'application/octet-stream',
      iframeInlinePdf: isPdfUrl(kbbUrl),
    });
  } catch (error) {
    console.error(`GET /api/vehicles/${vehicleId}/kbb-report failed`, error);
    return new Response('Failed to load KBB report', { status: 500 });
  }
};
