import { isPlaceholderDocumentUrl } from './original-sticker-url';

function isOwnStorageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === 'storage.googleapis.com' ||
      host.endsWith('.firebasestorage.app') ||
      host === 'firebasestorage.googleapis.com'
    );
  } catch {
    return url.startsWith('data:');
  }
}

/**
 * Resolve the KBB report URL for display and proxy allowlisting.
 * Prefers `kbbReportUrl`; falls back to legacy `documents.kbbReport`.
 */
export function resolveKbbReportUrl(vehicle: {
  kbbReportUrl?: string;
  documents?: { kbbReport?: string };
}): string | undefined {
  const candidates = [vehicle.kbbReportUrl, vehicle.documents?.kbbReport];

  for (const url of candidates) {
    const trimmed = url?.trim();
    if (!trimmed || isPlaceholderDocumentUrl(trimmed)) continue;
    if (trimmed.startsWith('data:') || isOwnStorageUrl(trimmed)) {
      return trimmed;
    }
  }

  return undefined;
}
