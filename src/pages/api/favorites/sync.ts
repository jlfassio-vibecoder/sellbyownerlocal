import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  requireAuthenticated,
  requireVerificationTier,
  unauthorizedResponse,
  verificationRequiredResponse,
  VerificationRequiredError,
} from '../../../lib/auth';
import {
  listFavoritesForBuyer,
  upsertFavoriteForBuyer,
} from '../../../lib/favorites-server';
import { FavoriteItemSchema, FavoritesListResponseSchema } from '../../../schemas';

const FavoritesSyncBodySchema = z.object({
  items: z.array(FavoriteItemSchema),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireAuthenticated(request, cookies);
    requireVerificationTier(session, 'phone_verified');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = FavoritesSyncBodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Deduplicate by id — last write wins for metadata.
    const byId = new Map(parsed.data.items.map((item) => [item.id, item]));

    for (const item of byId.values()) {
      const result = await upsertFavoriteForBuyer(session.uid, item);
      if (result.status === 'skipped') {
        console.warn(
          `[FAVORITES SYNC] Skipped ${item.category} ${item.id}: ${result.reason}`
        );
      }
    }

    const items = await listFavoritesForBuyer(session.uid);
    const response = FavoritesListResponseSchema.parse({ items });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    if (error instanceof VerificationRequiredError) {
      return verificationRequiredResponse(error);
    }

    console.error('POST /api/favorites/sync failed', error);
    return new Response(JSON.stringify({ error: 'Failed to sync favorites' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
