import { storageBucket } from './firebase-admin';
import { parseOwnedStorageObjectPath, toDirectStorageObjectUrl } from './storage-url';

const INLINE_PDF_HEADERS: Record<string, string> = {
  'Content-Type': 'application/pdf',
  'Content-Disposition': 'inline; filename="document.pdf"',
  'X-Frame-Options': 'SAMEORIGIN',
  'Cache-Control': 'public, max-age=3600',
};

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

function isAllowedApparelCatalogPath(objectPath: string, sellerId: string): boolean {
  return (
    objectPath.startsWith(`apparel-pdfs/${sellerId}/`) ||
    objectPath.startsWith(`catalogs/${sellerId}/`)
  );
}

/**
 * Stream a clothing catalog / line-sheet PDF through a same-origin Response
 * for iframe embedding. Uses the URL stored on the listing only, and only
 * serves objects under that seller's apparel-pdfs/ or catalogs/ prefixes.
 */
export async function streamClothingCatalogFile(
  fileUrl: string,
  sellerId: string
): Promise<Response> {
  const trimmedSellerId = sellerId.trim();
  if (!trimmedSellerId) {
    return new Response('Forbidden: Invalid document source.', { status: 403 });
  }

  const bucket = storageBucket();
  const objectPath = resolveBucketObjectPath(fileUrl, bucket.name);

  if (!objectPath || !isAllowedApparelCatalogPath(objectPath, trimmedSellerId)) {
    return new Response('Forbidden: Invalid document source.', { status: 403 });
  }

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
