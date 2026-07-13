import type { APIRoute } from 'astro';
import {
  AuthError,
  requireAuthenticated,
  unauthorizedResponse,
} from '../../../lib/auth';
import { db } from '../../../lib/firebase-admin';
import { buildBuyerConversation, mapMessageDoc, toBuyerConversationRows } from '../../../lib/messages';
import { resolveHeroImageUrls } from '../../../lib/resolve-display-media';
import {
  BuyerConversationsResponseSchema,
  VehicleResponseSchema,
} from '../../../schemas';

/** Enough recent messages to build current conversation rows without unbounded reads. */
const BUYER_CONVERSATION_MESSAGE_LIMIT = 300;

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireAuthenticated(request, cookies);

    const snapshot = await db()
      .collection('messages')
      .where('buyerUid', '==', session.uid)
      .orderBy('timestamp', 'desc')
      .limit(BUYER_CONVERSATION_MESSAGE_LIMIT)
      .get();

    const messages = snapshot.docs.flatMap((messageDoc) => {
      const parsed = mapMessageDoc(messageDoc.id, messageDoc.data() as Record<string, unknown>);
      return parsed.success ? [parsed.data] : [];
    });

    const rows = toBuyerConversationRows(messages);
    const vehicleIds = [...new Set(rows.map((row) => row.vehicleId))];

    const vehicleSnaps =
      vehicleIds.length > 0
        ? await db().getAll(...vehicleIds.map((id) => db().collection('vehicles').doc(id)))
        : [];

    const vehicleMeta = new Map<string, { title: string; imageUrl: string }>();
    for (const snap of vehicleSnaps) {
      if (!snap.exists) continue;
      const parsed = VehicleResponseSchema.safeParse({ id: snap.id, ...snap.data() });
      if (!parsed.success) continue;
      const vehicle = parsed.data;
      const title =
        vehicle.listingTitle?.trim() ||
        `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim() ||
        'Vehicle';
      const imageUrl = resolveHeroImageUrls(vehicle)[0] ?? '';
      vehicleMeta.set(snap.id, { title, imageUrl });
    }

    const conversations = rows.flatMap((row) => {
      const meta = vehicleMeta.get(row.vehicleId);
      const built = buildBuyerConversation({
        sessionId: row.sessionId,
        vehicleId: row.vehicleId,
        vehicleTitle: meta?.title ?? 'Vehicle',
        vehicleImageUrl: meta?.imageUrl ?? '',
        latestMessage: row,
        unreadCount: row.unreadCount,
      });
      return built ? [built] : [];
    });

    const response = BuyerConversationsResponseSchema.parse({ conversations });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('GET /api/buyer/conversations failed', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch conversations' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
