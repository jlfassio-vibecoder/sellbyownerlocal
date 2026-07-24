/**
 * Prefer the storage.googleapis.com object URL for PDF embeds; Firebase download
 * URLs often load in a new tab but render blank inside iframes/objects.
 */
export function toDirectStorageObjectUrl(url: string): string {
  if (url.startsWith('data:') || url.startsWith('/')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'firebasestorage.googleapis.com') {
      const bucket = parsed.pathname.match(/\/b\/([^/]+)/)?.[1];
      const encodedObject = parsed.pathname.match(/\/o\/(.+)$/)?.[1];
      if (bucket && encodedObject) {
        const objectPath = decodeURIComponent(encodedObject);
        return `https://storage.googleapis.com/${bucket}/${objectPath}`;
      }
    }

    if (host === 'storage.googleapis.com') {
      return url;
    }
  } catch {
    // fall through
  }

  return url;
}

/** Normalize and allowlist Storage hosts for server-side PDF image fetches (SSRF guard). */
export function toAllowedCatalogImageUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
    return undefined;
  }

  try {
    const direct = toDirectStorageObjectUrl(trimmed);
    const host = new URL(direct).hostname.toLowerCase();
    if (
      host === 'storage.googleapis.com' ||
      host === 'firebasestorage.googleapis.com' ||
      host.endsWith('.firebasestorage.app')
    ) {
      return direct;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 * Parse a public Storage URL into a GCS object path when it belongs to `bucketName`.
 */
export function parseOwnedStorageObjectPath(url: string, bucketName: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'storage.googleapis.com') {
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length < 2) return null;
      const [bucket, ...pathParts] = segments;
      if (bucket !== bucketName) return null;
      return pathParts.join('/');
    }

    if (host === 'firebasestorage.googleapis.com') {
      const bucket = parsed.pathname.match(/\/b\/([^/]+)/)?.[1];
      const encodedObject = parsed.pathname.match(/\/o\/(.+)$/)?.[1];
      if (!bucket || !encodedObject || bucket !== bucketName) return null;
      return decodeURIComponent(encodedObject);
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Like parseOwnedStorageObjectPath, but only for objects under vehicles/{vehicleId}/.
 * Returns null for external URLs or paths outside this vehicle's prefix.
 */
export function parseVehicleOwnedStorageObjectPath(
  url: string,
  vehicleId: string,
  bucketName: string
): string | null {
  const path = parseOwnedStorageObjectPath(url, bucketName);
  if (!path) return null;
  const prefix = `vehicles/${vehicleId}/`;
  if (!path.startsWith(prefix)) return null;
  return path;
}
