import type { APIRoute } from 'astro';
import { db } from '../../../../lib/firebase-admin';
import { isAllowedHistoryReportUrl } from '../../../../lib/history-report-urls';
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

    if (!isAllowedHistoryReportUrl(parsed.data, fileUrl)) {
      return new Response('History report not found', { status: 404 });
    }

    return streamOwnedVehicleFile(vehicleId, fileUrl, {
      allowedSubpaths: ['history_report/', 'documents/'],
      fallbackContentType: 'application/octet-stream',
      iframeInlinePdf: isPdfUrl(fileUrl),
    });
  } catch (error) {
    console.error(`GET /api/vehicles/${vehicleId}/history-report failed`, error);
    return new Response('Failed to load history report', { status: 500 });
  }
};
