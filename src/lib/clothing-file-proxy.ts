import { storageBucket } from './firebase-admin';
import { parseOwnedStorageObjectPath, toDirectStorageObjectUrl } from './storage-url';

const INLINE_PDF_HEADERS: Record<string, string> = {
  'Content-Type': 'application/pdf',
  'Content-Disposition': 'inline; filename="document.pdf"',
  'X-Frame-Options': 'SAMEORIGIN',
  'Cache-Control': 'public, max-age=3600',
};

const ALLOWED_FETCH_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

function parseGsUrl(url: string, bucketName: string): string | null {
  if (!url.startsWith('gs://')) return null;
  const withoutScheme = url.slice('gs://'.length);
  const slash = withoutScheme.indexOf('/');
  if (slash <= 0) return null;
  const bucket = withoutScheme.slice(0, slash);
  const objectPath = withoutScheme.slice(slash + 1);
  if (bucket !== bucketName || !objectPath) return null;
  return objectPath;
}

function resolveBucketObjectPath(fileUrl: string, bucketName: string): string | null {
  const gsPath = parseGsUrl(fileUrl, bucketName);
  if (gsPath) return gsPath;

  const directUrl = toDirectStorageObjectUrl(fileUrl);
  return parseOwnedStorageObjectPath(directUrl, bucketName);
}

function isAllowedStorageFetchUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_FETCH_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Stream a clothing catalog / line-sheet PDF through a same-origin Response
 * for iframe embedding. Uses the URL stored on the listing only.
 */
export async function streamClothingCatalogFile(fileUrl: string): Promise<Response> {
  const bucket = storageBucket();
  const objectPath = resolveBucketObjectPath(fileUrl, bucket.name);

  if (objectPath) {
    const gcsFile = bucket.file(objectPath);
    const [buffer] = await gcsFile.download();
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        ...INLINE_PDF_HEADERS,
        'Content-Length': String(buffer.length),
      },
    });
  }

  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const fetchUrl = toDirectStorageObjectUrl(fileUrl);
    if (!isAllowedStorageFetchUrl(fetchUrl)) {
      return new Response('Forbidden: Invalid document source.', { status: 403 });
    }

    const upstream = await fetch(fetchUrl);
    if (!upstream.ok) {
      return new Response('Failed to fetch catalog document', { status: 502 });
    }
    const buffer = new Uint8Array(await upstream.arrayBuffer());
    return new Response(buffer, {
      status: 200,
      headers: {
        ...INLINE_PDF_HEADERS,
        'Content-Length': String(buffer.length),
      },
    });
  }

  return new Response('Invalid catalog URL', { status: 400 });
}
