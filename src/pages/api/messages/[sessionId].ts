import type { APIRoute } from 'astro';
import { db } from '../../../lib/firebase-admin';
import { mapMessageDoc } from '../../../lib/messages';

// Copilot suggestion ignored: sessionId acts as an unguessable capability token scoped by vehicleId (Phase 4 design).
export const GET: APIRoute = async ({ params, url }) => {
  const sessionId = params.sessionId?.trim();

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const vehicleId = url.searchParams.get('vehicleId')?.trim();

  if (!vehicleId) {
    return new Response(JSON.stringify({ error: 'vehicleId query parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const snapshot = await db()
      .collection('messages')
      .where('sessionId', '==', sessionId)
      .where('vehicleId', '==', vehicleId)
      .orderBy('timestamp', 'asc')
      .get();

    const messages = snapshot.docs.flatMap((doc) => {
      const parsed = mapMessageDoc(doc.id, doc.data() as Record<string, unknown>);
      return parsed.success ? [parsed.data] : [];
    });

    return new Response(JSON.stringify(messages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`GET /api/messages/${sessionId} failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to fetch messages' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
