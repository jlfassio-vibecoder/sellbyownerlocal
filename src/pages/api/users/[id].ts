import type { APIRoute } from 'astro';
import { db } from '../../../lib/firebase-admin';
import { UserResponseSchema } from '../../../schemas';

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

    const parsed = UserResponseSchema.safeParse({ id: doc.id, ...doc.data() });
    if (!parsed.success) {
      console.error('User document failed validation', id, parsed.error.flatten());
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
