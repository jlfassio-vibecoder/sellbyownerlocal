import type { ServiceRecord } from '../schemas';

export function parseServiceRecordDate(date: string): number {
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Newest service date first; unparseable/empty dates sort to the end. */
export function sortServiceRecordsByDate(records: ServiceRecord[]): ServiceRecord[] {
  return [...records].sort(
    (a, b) => parseServiceRecordDate(b.date) - parseServiceRecordDate(a.date)
  );
}
