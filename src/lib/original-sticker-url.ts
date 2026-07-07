const PLACEHOLDER_DOCUMENT_URL_PATTERNS = [
  /w3\.org\/WAI\/ER\/tests\/xhtml\/testfiles\/resources\/pdf\/dummy\.pdf/i,
  /w3schools\.com/i,
];

/** Seed / demo URLs that must not be treated as a seller-uploaded original sticker. */
export function isPlaceholderDocumentUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  return PLACEHOLDER_DOCUMENT_URL_PATTERNS.some((pattern) => pattern.test(url));
}

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
 * Resolve the sticker URL to display on the public listing.
 * Prefers `originalStickerUrl`, then legacy `documents.windowSticker` when it is
 * not a known placeholder and is either our Storage URL or a data URI.
 */
export function resolveOriginalStickerUrl(vehicle: {
  originalStickerUrl?: string;
  documents?: { windowSticker?: string };
}): string | undefined {
  const candidates = [vehicle.originalStickerUrl, vehicle.documents?.windowSticker];

  for (const url of candidates) {
    const trimmed = url?.trim();
    if (!trimmed || isPlaceholderDocumentUrl(trimmed)) continue;
    if (trimmed.startsWith('data:') || isOwnStorageUrl(trimmed)) {
      return trimmed;
    }
  }

  return undefined;
}
