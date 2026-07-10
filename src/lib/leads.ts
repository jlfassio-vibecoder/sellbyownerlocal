import { db } from './firebase-admin';
import { LeadRecordSchema, type LeadRecord } from '../schemas';

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function mapLeadDoc(id: string, data: Record<string, unknown>) {
  const parsed = LeadRecordSchema.safeParse({
    id,
    sellerId: data.sellerId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    message: data.message,
    items: data.items ?? [],
    createdAt: toIsoTimestamp(data.createdAt),
  });

  if (parsed.success) {
    return parsed;
  }

  return LeadRecordSchema.safeParse({
    id,
    sellerId: asString(data.sellerId, 'unknown'),
    name: asString(data.name, 'Unknown'),
    email: asString(data.email, 'unknown@example.com'),
    phone: asString(data.phone, ''),
    message: asString(data.message, ''),
    items: Array.isArray(data.items) ? data.items : [],
    createdAt: toIsoTimestamp(data.createdAt) ?? new Date().toISOString(),
  });
}

export async function getSellerLeads(sellerId: string): Promise<LeadRecord[]> {
  const snapshot = await db()
    .collection('leads')
    .where('sellerId', '==', sellerId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.flatMap((doc) => {
    const parsed = mapLeadDoc(doc.id, doc.data() as Record<string, unknown>);
    return parsed.success ? [parsed.data] : [];
  });
}
