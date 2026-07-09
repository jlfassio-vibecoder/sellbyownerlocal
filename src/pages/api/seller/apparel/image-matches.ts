import type { APIRoute } from 'astro';
import { z } from 'zod';
import { AuthError, requireSeller, unauthorizedResponse } from '../../../../lib/auth';
import { db } from '../../../../lib/firebase-admin';

const ImageMatchesRequestSchema = z.object({
  filenames: z.array(z.string().min(1)).max(100),
});

function imageMatchDocId(sellerId: string, filename: string): string {
  const encodedFilename = Buffer.from(filename, 'utf8').toString('base64url');
  return `${sellerId}_${encodedFilename}`;
}

async function loadMatchResults(sellerId: string, filenames: string[]) {
  return Promise.all(
    filenames.map(async (filename) => {
      const docId = imageMatchDocId(sellerId, filename);
      const snap = await db().collection('apparel_image_matches').doc(docId).get();
      if (!snap.exists) return null;
      const data = snap.data() as Record<string, unknown>;
      if (data.sellerId !== sellerId) return null;
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
}

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

    const results = await loadMatchResults(session.uid, filenames);

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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireSeller(request, cookies);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = ImageMatchesRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = await loadMatchResults(session.uid, parsed.data.filenames);

    return new Response(JSON.stringify({ results: results.filter(Boolean) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error('POST /api/seller/apparel/image-matches failed', error);
    return new Response(JSON.stringify({ error: 'Failed to load match results' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
