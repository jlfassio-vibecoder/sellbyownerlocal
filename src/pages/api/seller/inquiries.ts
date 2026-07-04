import type { APIRoute } from 'astro';
import { AuthError, requireSeller, unauthorizedResponse } from '../../../lib/auth';
import { db } from '../../../lib/firebase-admin';
import { mapInquiryDoc } from '../../../lib/inquiries';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const session = await requireSeller(request, cookies);
    const vehicleId = url.searchParams.get('vehicleId')?.trim() || undefined;

    let query = db().collection('inquiries').where('sellerId', '==', session.uid);
    if (vehicleId) {
      query = query.where('vehicleId', '==', vehicleId);
    }

    const snapshot = await query.orderBy('timestamp', 'desc').get();

    const inquiries = snapshot.docs.flatMap((doc) => {
      const parsed = mapInquiryDoc(doc.id, doc.data() as Record<string, unknown>);
      return parsed.success ? [parsed.data] : [];
    });

    return new Response(JSON.stringify(inquiries), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('GET /api/seller/inquiries failed', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch inquiries' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
