import { InquiryRecordSchema } from '../schemas';

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export function mapInquiryDoc(id: string, data: Record<string, unknown>) {
  return InquiryRecordSchema.safeParse({
    id,
    ...data,
    timestamp: toIsoTimestamp(data.timestamp),
  });
}
