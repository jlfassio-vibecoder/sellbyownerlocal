import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../lib/auth';
import {
  claimOrUpdateStorefrontSlug,
  getUserProfile,
  StorefrontSlugConflictError,
  StorefrontSlugValidationError,
  updateUserDisplayName,
} from '../../../lib/buyer-profile';
import { auth, db } from '../../../lib/firebase-admin';
import { PublicUserResponseSchema, UserProfileUpdateSchema } from '../../../schemas';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const doc = await db().collection('users').doc(id).get();

    if (!doc.exists) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = doc.data() as Record<string, unknown>;
    const parsed = PublicUserResponseSchema.safeParse({
      id: doc.id,
      displayName: data.displayName,
      stats: data.stats,
      verificationTier: data.verificationTier,
      storefrontSlug: data.storefrontSlug,
    });

    if (!parsed.success) {
      console.error('User document failed validation', id, z.flattenError(parsed.error));
      return new Response(JSON.stringify({ error: 'Invalid user data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsed.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`GET /api/users/${id} failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to fetch user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const session = await requireSeller(request, cookies);
    if (session.uid !== id) {
      return forbiddenResponse();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = UserProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await updateUserDisplayName(id, parsed.data.displayName);

    try {
      await auth().updateUser(id, { displayName: parsed.data.displayName.trim() });
    } catch (authError) {
      console.warn(`PATCH /api/users/${id}: Firebase Auth displayName sync failed`, authError);
    }

    if (parsed.data.storefrontSlug) {
      await claimOrUpdateStorefrontSlug(id, parsed.data.storefrontSlug);
    }

    const profile = await getUserProfile(id);
    if (!profile) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = PublicUserResponseSchema.safeParse({
      id: profile.id,
      displayName: profile.displayName,
      stats: profile.stats,
      verificationTier: profile.verificationTier,
      storefrontSlug: profile.storefrontSlug,
    });

    if (!response.success) {
      return new Response(JSON.stringify({ error: 'Invalid user data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(error.message);
    }
    if (error instanceof StorefrontSlugConflictError) {
      return new Response(JSON.stringify({ error: 'Storefront URL is already taken' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (error instanceof StorefrontSlugValidationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error(`PATCH /api/users/${id} failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to update user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
