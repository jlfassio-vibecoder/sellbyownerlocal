import type { APIRoute } from 'astro';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../../lib/auth';
import { db } from '../../../../lib/firebase-admin';
import { ClothingListingStatusSchema } from '../../../../schemas';

const UpdateItemUpdatesSchema = z
  .object({
    title: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    price: z.number().nonnegative().optional(),
    description: z.string().min(1).optional(),
    material: z.string().optional(),
    sizes: z.array(z.string().min(1)).optional(),
    colors: z.array(z.string().min(1)).optional(),
    status: ClothingListingStatusSchema.optional(),
    isFeatured: z.boolean().optional(),
    isSale: z.boolean().optional(),
    salePrice: z.number().nonnegative().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required in updates',
  });

const UpdateItemSchema = z.object({
  id: z.string().min(1),
  updates: UpdateItemUpdatesSchema,
});

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

    const parsed = UpdateItemSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ref = db().collection('clothing_listings').doc(parsed.data.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = doc.data() ?? {};
    const existingSellerId = existing.sellerId;
    if (existingSellerId !== session.uid) {
      return forbiddenResponse();
    }

    const { updates } = parsed.data;
    const nextPrice =
      typeof updates.price === 'number' ? updates.price : Number(existing.price ?? 0);
    const nextSalePrice =
      updates.salePrice === undefined
        ? typeof existing.salePrice === 'number'
          ? existing.salePrice
          : undefined
        : updates.salePrice === null
          ? undefined
          : updates.salePrice;

    if (typeof nextSalePrice === 'number' && nextSalePrice >= nextPrice) {
      return new Response(
        JSON.stringify({ error: 'Sale price must be lower than the wholesale price' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const firestoreUpdate: Record<string, unknown> = { ...updates };
    if (updates.isSale === false || updates.salePrice === null) {
      firestoreUpdate.salePrice = FieldValue.delete();
    }

    await ref.update(firestoreUpdate);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse();
    }
    console.error('POST /api/seller/apparel/update-item failed', error);
    return new Response(JSON.stringify({ error: 'Failed to update listing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
