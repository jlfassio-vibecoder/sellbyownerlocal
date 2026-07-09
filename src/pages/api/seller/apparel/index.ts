import type { APIRoute } from 'astro';
import { AuthError, requireSeller, unauthorizedResponse } from '../../../../lib/auth';
import { db } from '../../../../lib/firebase-admin';
import { ClothingListingCreateSchema } from '../../../../schemas';

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

    const parsed = ClothingListingCreateSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ref = db().collection('clothing_listings').doc();

    await ref.set({
      ...parsed.data,
      sellerId: session.uid,
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ id: ref.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    console.error('POST /api/seller/apparel failed', error);
    return new Response(JSON.stringify({ error: 'Failed to create listing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
