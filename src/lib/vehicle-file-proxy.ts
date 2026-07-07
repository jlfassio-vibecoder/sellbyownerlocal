import { Readable } from 'node:stream';
import { storageBucket } from './firebase-admin';
import { parseOwnedStorageObjectPath, toDirectStorageObjectUrl } from './storage-url';

function inferContentTypeFromPath(objectPath: string, fallback: string): string {
  const lower = objectPath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return fallback;
}

export interface StreamOwnedVehicleFileOptions {
  allowedSubpaths?: string[];
  fallbackContentType?: string;
  /** Buffer small files (e.g. PDFs) instead of streaming — more reliable for pdf.js fetch. */
  preferBuffered?: boolean;
  /** Force inline PDF headers for same-origin iframe embedding. */
  iframeInlinePdf?: boolean;
}

function buildResponseHeaders(
  contentType: string,
  iframeInlinePdf: boolean
): Record<string, string> {
  if (iframeInlinePdf) {
    return {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="document.pdf"',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'public, max-age=3600',
    };
  }

  return {
    'Content-Type': contentType,
    'Content-Disposition': 'inline',
    'Cache-Control': 'public, max-age=3600',
  };
}

/**
 * Stream a GCS object belonging to a vehicle through a same-origin Response.
 */
export async function streamOwnedVehicleFile(
  vehicleId: string,
  fileUrl: string,
  options: StreamOwnedVehicleFileOptions = {}
): Promise<Response> {
  const { allowedSubpaths, fallbackContentType = 'application/octet-stream', preferBuffered, iframeInlinePdf = false } =
    options;
  const directUrl = toDirectStorageObjectUrl(fileUrl);
  const bucket = storageBucket();
  const objectPath = parseOwnedStorageObjectPath(directUrl, bucket.name);

  if (!objectPath) {
    return new Response('Invalid file URL', { status: 400 });
  }

  const expectedPrefix = `vehicles/${vehicleId}/`;
  if (!objectPath.startsWith(expectedPrefix)) {
    return new Response('File does not belong to this vehicle', { status: 400 });
  }

  if (allowedSubpaths?.length) {
    const relativePath = objectPath.slice(expectedPrefix.length);
    const allowed = allowedSubpaths.some((subpath) => relativePath.startsWith(subpath));
    if (!allowed) {
      return new Response('File path not allowed', { status: 400 });
    }
  }

  const gcsFile = bucket.file(objectPath);
  const [metadata] = await gcsFile.getMetadata();
  const contentType =
    metadata.contentType && metadata.contentType !== 'application/octet-stream'
      ? metadata.contentType
      : inferContentTypeFromPath(objectPath, fallbackContentType);

  const responseHeaders = buildResponseHeaders(contentType, iframeInlinePdf);

  if (preferBuffered || contentType === 'application/pdf' || iframeInlinePdf) {
    const [buffer] = await gcsFile.download();
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        ...responseHeaders,
        'Content-Length': String(buffer.length),
      },
    });
  }

  const nodeStream = gcsFile.createReadStream();
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  const size = metadata.size;
  return new Response(webStream, {
    status: 200,
    headers: {
      ...responseHeaders,
      ...(size != null ? { 'Content-Length': String(size) } : {}),
    },
  });
}
