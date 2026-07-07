import type { APIRoute } from 'astro';
import { getPublishedInventory } from '../../../lib/inventory-api';

export const GET: APIRoute = async () => {
  try {
    const vehicles = await getPublishedInventory();

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
