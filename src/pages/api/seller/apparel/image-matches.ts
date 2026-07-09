import type { APIRoute } from 'astro';
import { AuthError, requireSeller, unauthorizedResponse } from '../../../../lib/auth';
import { db } from '../../../../lib/firebase-admin';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const session = await requireSeller(request, cookies);
    const filenamesParam = url.searchParams.get('filenames')?.trim() ?? '';
    const filenames = filenamesParam
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    if (filenames.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = await Promise.all(
      filenames.map(async (filename) => {
        const docId = `${session.uid}_${filename}`.replace(/[^a-zA-Z0-9._-]/g, '_');
        const snap = await db().collection('apparel_image_matches').doc(docId).get();
        if (!snap.exists) return null;
        const data = snap.data() as Record<string, unknown>;
        if (data.sellerId !== session.uid) return null;
        return {
          filename,
          itemCode: String(data.itemCode ?? ''),
          status: String(data.status ?? ''),
          message: String(data.message ?? ''),
          listingId: data.listingId ? String(data.listingId) : null,
          listingTitle: data.listingTitle ? String(data.listingTitle) : null,
        };
      })
    );

    return new Response(JSON.stringify({ results: results.filter(Boolean) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error('GET /api/seller/apparel/image-matches failed', error);
    return new Response(JSON.stringify({ error: 'Failed to load match results' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
