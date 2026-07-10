import type { APIRoute } from 'astro';
import {
  AuthError,
  ForbiddenError,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../../lib/auth';
import { streamApparelGalleryImage } from '../../../../lib/apparel-gallery-proxy';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const session = await requireSeller(request, cookies);
    const imageUrl = url.searchParams.get('url')?.trim() ?? '';

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image URL required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return streamApparelGalleryImage(imageUrl, session.uid);
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(error.message);
    }
    console.error('GET /api/seller/apparel/gallery-image failed', error);
    return new Response(JSON.stringify({ error: 'Failed to load image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
