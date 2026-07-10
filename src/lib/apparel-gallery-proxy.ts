import { storageBucket } from './firebase-admin';
import { parseOwnedStorageObjectPath, toDirectStorageObjectUrl } from './storage-url';

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

function isAllowedApparelGalleryPath(objectPath: string, sellerId: string): boolean {
  return (
    objectPath.startsWith(`apparel-images/${sellerId}/`) ||
    objectPath.startsWith(`apparel-images/staging/${sellerId}/`)
  );
}

function contentTypeForPath(objectPath: string): string {
  const lower = objectPath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

/**
 * Stream a seller-owned apparel gallery image through a same-origin Response
 * so the browser can crop it on canvas without Firebase Storage CORS.
 */
export async function streamApparelGalleryImage(
  fileUrl: string,
  sellerId: string
): Promise<Response> {
  const trimmedSellerId = sellerId.trim();
  if (!trimmedSellerId) {
    return new Response('Forbidden: Invalid image source.', { status: 403 });
  }

  const bucket = storageBucket();
  const objectPath = resolveBucketObjectPath(fileUrl, bucket.name);

  if (!objectPath || !isAllowedApparelGalleryPath(objectPath, trimmedSellerId)) {
    return new Response('Forbidden: Invalid image source.', { status: 403 });
  }

  const gcsFile = bucket.file(objectPath);
  const [buffer] = await gcsFile.download();
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': contentTypeForPath(objectPath),
      'Cache-Control': 'private, max-age=60',
      'Content-Length': String(buffer.length),
    },
  });
}
