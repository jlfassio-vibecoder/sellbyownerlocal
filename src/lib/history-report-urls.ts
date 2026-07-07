import { isPlaceholderDocumentUrl } from './original-sticker-url';
import { toDirectStorageObjectUrl } from './storage-url';

function isOwnStorageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === 'storage.googleapis.com' ||
      host.endsWith('.firebasestorage.app') ||
      host === 'firebasestorage.googleapis.com'
    );
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  return toDirectStorageObjectUrl(url.trim());
}

function isResolvableUrl(url: string): boolean {
  return url.startsWith('data:') || isOwnStorageUrl(url);
}

/**
 * Resolve vehicle history report URLs for display and proxy allowlisting.
 * Prefers `historyReportUrls`; falls back to legacy `documents.carfaxReport`.
 */
export function resolveHistoryReportUrls(vehicle: {
  historyReportUrls?: string[];
  documents?: { carfaxReport?: string };
}): string[] {
  const fromArray = (vehicle.historyReportUrls ?? [])
    .map((url) => url.trim())
    .filter((url) => url && !isPlaceholderDocumentUrl(url) && isResolvableUrl(url));

  if (fromArray.length > 0) {
    return fromArray;
  }

  const legacy = vehicle.documents?.carfaxReport?.trim();
  if (!legacy || isPlaceholderDocumentUrl(legacy)) {
    return [];
  }

  if (legacy.startsWith('data:') || isOwnStorageUrl(legacy)) {
    return [legacy];
  }

  return [];
}

/** Check whether a URL is allowed for a vehicle's history reports (after normalization). */
export function isAllowedHistoryReportUrl(
  vehicle: {
    historyReportUrls?: string[];
    documents?: { carfaxReport?: string };
  },
  requestedUrl: string
): boolean {
  const normalized = normalizeUrl(requestedUrl);
  return resolveHistoryReportUrls(vehicle).some(
    (allowed) => normalizeUrl(allowed) === normalized
  );
}
