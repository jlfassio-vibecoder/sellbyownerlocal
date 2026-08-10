import type { APIRoute } from 'astro';
import {
  AuthError,
  unauthorizedResponse,
  requireSeller,
} from '../../../../lib/auth';
import { getApparelSellerAnalytics } from '../../../../lib/apparel-analytics';
import { ListingAnalyticsRangeSchema } from '../../../../schemas';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const rangeParsed = ListingAnalyticsRangeSchema.safeParse(
    url.searchParams.get('range') ?? '30d'
  );
  if (!rangeParsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid range parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const session = await requireSeller(request, cookies);
    const analytics = await getApparelSellerAnalytics(session.uid, rangeParsed.data);

    return new Response(JSON.stringify(analytics), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }

    console.error('GET /api/seller/apparel/analytics failed', error);
    return new Response(JSON.stringify({ error: 'Failed to load analytics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
