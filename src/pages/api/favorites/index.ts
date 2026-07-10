import type { APIRoute } from 'astro';
import { AuthError, getOptionalSession } from '../../../lib/auth';
import { listFavoritesForBuyer } from '../../../lib/favorites-server';
import { FavoritesListResponseSchema } from '../../../schemas';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await getOptionalSession(request, cookies);
    if (!session) {
      const response = FavoritesListResponseSchema.parse({ items: [] });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const items = await listFavoritesForBuyer(session.uid);
    const response = FavoritesListResponseSchema.parse({ items });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const response = FavoritesListResponseSchema.parse({ items: [] });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('GET /api/favorites failed', error);
    return new Response(JSON.stringify({ error: 'Failed to load favorites' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
