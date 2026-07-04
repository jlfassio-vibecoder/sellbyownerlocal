import type { APIRoute } from 'astro';
import { db } from '../../../lib/firebase-admin';
import { VehicleResponseSchema } from '../../../schemas';

export const GET: APIRoute = async () => {
  try {
    const snapshot = await db()
      .collection('vehicles')
      .where('status', '==', 'active')
      .get();

    const vehicles = snapshot.docs.flatMap((doc) => {
      const parsed = VehicleResponseSchema.safeParse({ id: doc.id, ...doc.data() });
      return parsed.success ? [parsed.data] : [];
    });

    return new Response(JSON.stringify({ vehicles }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GET /api/vehicles failed', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch vehicles' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
