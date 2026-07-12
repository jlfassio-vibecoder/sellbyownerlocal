import { Readable } from 'node:stream';
import { resolveHistoryReportUrls } from './history-report-urls';
import { db, storageBucket } from './firebase-admin';
import { resolveKbbReportUrl } from './kbb-report-url';
import { resolveOriginalStickerUrl } from './original-sticker-url';
import { resolveSmogCertificateUrls } from './smog-certificate-url';
import { parseOwnedStorageObjectPath, toDirectStorageObjectUrl } from './storage-url';
import { VehicleResponseSchema } from '../schemas';

function inferContentTypeFromPath(objectPath: string, fallback: string): string {
  const lower = objectPath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return fallback;
}

function normalizeAllowlistUrl(url: string): string {
  return toDirectStorageObjectUrl(url.trim());
}

function buildVehicleFileAllowlist(vehicle: {
  historyReportUrls?: string[];
  documents?: {
    carfaxReport?: string;
    kbbReport?: string;
    smogReport?: string;
    windowSticker?: string;
  };
  smogCertificateUrls?: string[];
  smogCertificateUrl?: string;
  kbbReportUrl?: string;
  originalStickerUrl?: string;
}): string[] {
  const urls = [
    ...resolveHistoryReportUrls(vehicle),
    ...resolveSmogCertificateUrls(vehicle),
    resolveKbbReportUrl(vehicle),
    resolveOriginalStickerUrl(vehicle),
  ].filter((url): url is string => Boolean(url?.trim()));

  return urls.map(normalizeAllowlistUrl);
}

export interface StreamOwnedVehicleFileOptions {
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
 * Authz is the Firestore document allowlist only (Storage folder id may differ).
 */
export async function streamOwnedVehicleFile(
  vehicleId: string,
  fileUrl: string,
  options: StreamOwnedVehicleFileOptions = {}
): Promise<Response> {
  const { fallbackContentType = 'application/octet-stream', preferBuffered, iframeInlinePdf = false } =
    options;

  const doc = await db().collection('vehicles').doc(vehicleId).get();
  if (!doc.exists) {
    return new Response('Vehicle not found', { status: 404 });
  }

  const parsed = VehicleResponseSchema.safeParse({ id: doc.id, ...doc.data() });
  if (!parsed.success) {
    return new Response('Vehicle not found', { status: 404 });
  }

  const normalizedRequested = normalizeAllowlistUrl(fileUrl);
  const allowlist = buildVehicleFileAllowlist(parsed.data);
  if (!allowlist.includes(normalizedRequested)) {
    return new Response('File not allowed for this vehicle', { status: 403 });
  }

  const directUrl = toDirectStorageObjectUrl(fileUrl);
  const bucket = storageBucket();
  const objectPath = parseOwnedStorageObjectPath(directUrl, bucket.name);

  if (!objectPath) {
    return new Response('Invalid file URL', { status: 400 });
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
