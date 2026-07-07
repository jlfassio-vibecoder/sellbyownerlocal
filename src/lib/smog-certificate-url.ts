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
    return url.startsWith('data:');
  }
}

function normalizeUrl(url: string): string {
  return toDirectStorageObjectUrl(url.trim());
}

function isResolvableUrl(url: string): boolean {
  return url.startsWith('data:') || isOwnStorageUrl(url);
}

/**
 * Resolve smog certificate URLs for display and proxy allowlisting.
 * Prefers `smogCertificateUrls`; falls back to transitional `smogCertificateUrl`
 * and legacy `documents.smogReport`.
 */
export function resolveSmogCertificateUrls(vehicle: {
  smogCertificateUrls?: string[];
  smogCertificateUrl?: string;
  documents?: { smogReport?: string };
}): string[] {
  const fromArray = (vehicle.smogCertificateUrls ?? [])
    .map((url) => url.trim())
    .filter((url) => url && !isPlaceholderDocumentUrl(url) && isResolvableUrl(url));

  if (fromArray.length > 0) {
    return fromArray;
  }

  const transitional = vehicle.smogCertificateUrl?.trim();
  if (transitional && !isPlaceholderDocumentUrl(transitional) && isResolvableUrl(transitional)) {
    return [transitional];
  }

  const legacy = vehicle.documents?.smogReport?.trim();
  if (!legacy || isPlaceholderDocumentUrl(legacy) || !isResolvableUrl(legacy)) {
    return [];
  }

  return [legacy];
}

/** Check whether a URL is allowed for a vehicle's smog certificates (after normalization). */
export function isAllowedSmogCertificateUrl(
  vehicle: {
    smogCertificateUrls?: string[];
    smogCertificateUrl?: string;
    documents?: { smogReport?: string };
  },
  requestedUrl: string
): boolean {
  const normalized = normalizeUrl(requestedUrl);
  return resolveSmogCertificateUrls(vehicle).some(
    (allowed) => normalizeUrl(allowed) === normalized
  );
}
