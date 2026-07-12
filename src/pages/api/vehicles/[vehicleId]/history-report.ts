import type { APIRoute } from 'astro';
import { isPdfUrl } from '../../../../lib/pdf-url';
import { streamOwnedVehicleFile } from '../../../../lib/vehicle-file-proxy';

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
    return await streamOwnedVehicleFile(vehicleId, fileUrl, {
      fallbackContentType: 'application/octet-stream',
      iframeInlinePdf: isPdfUrl(fileUrl),
    });
  } catch (error) {
    console.error(`GET /api/vehicles/${vehicleId}/history-report failed`, error);
    return new Response('Failed to load history report', { status: 500 });
  }
};
