import type { APIRoute } from 'astro';
import { getClothingListingById } from '../../../../lib/clothing-api';
import { streamClothingCatalogFile } from '../../../../lib/clothing-file-proxy';

export const GET: APIRoute = async ({ params }) => {
  const id = params.id?.trim();

  if (!id) {
    return new Response('Listing not found', { status: 404 });
  }

  try {
    const listing = await getClothingListingById(id);
    if (!listing) {
      return new Response('Listing not found', { status: 404 });
    }

    const catalogUrl = listing.pdfLineSheetUrl?.trim();
    if (!catalogUrl) {
      return new Response('Brand catalog not found', { status: 404 });
    }

    return await streamClothingCatalogFile(catalogUrl);
  } catch (error) {
    console.error(`GET /api/clothing/${id}/catalog failed`, error);
    return new Response('Failed to load brand catalog', { status: 500 });
  }
};
