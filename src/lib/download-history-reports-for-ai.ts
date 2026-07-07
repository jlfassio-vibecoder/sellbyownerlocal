import { storageBucket } from './firebase-admin';
import { isAllowedHistoryReportUrl, resolveHistoryReportUrls } from './history-report-urls';
import { parseOwnedStorageObjectPath, toDirectStorageObjectUrl } from './storage-url';

const MAX_FILES = 20;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_SUBPATHS = ['history_report/', 'documents/'];

export type HistoryReportFileForAi = {
  base64: string;
  mediaType: string;
};

function inferContentTypeFromPath(objectPath: string, fallback: string): string {
  const lower = objectPath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return fallback;
}

async function downloadDataUri(url: string): Promise<HistoryReportFileForAi> {
  const commaIndex = url.indexOf(',');
  if (commaIndex < 0) {
    throw new Error('Invalid history report data URI');
  }

  const header = url.slice(0, commaIndex);
  const base64 = url.slice(commaIndex + 1);
  const mimeMatch = header.match(/^data:([^;]+);base64$/);
  const mediaType = mimeMatch?.[1] ?? 'application/octet-stream';
  const byteLength = Math.ceil((base64.length * 3) / 4);

  if (byteLength > MAX_FILE_BYTES) {
    throw new Error('History report file exceeds 5MB limit');
  }

  return { base64, mediaType };
}

async function downloadGcsFile(
  vehicleId: string,
  fileUrl: string
): Promise<HistoryReportFileForAi> {
  const directUrl = toDirectStorageObjectUrl(fileUrl);
  const bucket = storageBucket();
  const objectPath = parseOwnedStorageObjectPath(directUrl, bucket.name);

  if (!objectPath) {
    throw new Error('Invalid history report URL');
  }

  const expectedPrefix = `vehicles/${vehicleId}/`;
  if (!objectPath.startsWith(expectedPrefix)) {
    throw new Error('History report does not belong to this vehicle');
  }

  const relativePath = objectPath.slice(expectedPrefix.length);
  const allowed = ALLOWED_SUBPATHS.some((subpath) => relativePath.startsWith(subpath));
  if (!allowed) {
    throw new Error('History report path not allowed');
  }

  const gcsFile = bucket.file(objectPath);
  const [metadata] = await gcsFile.getMetadata();
  const size = Number(metadata.size ?? 0);

  if (size > MAX_FILE_BYTES) {
    throw new Error('History report file exceeds 5MB limit');
  }

  const [buffer] = await gcsFile.download();
  const mediaType =
    metadata.contentType && metadata.contentType !== 'application/octet-stream'
      ? metadata.contentType
      : inferContentTypeFromPath(objectPath, 'application/octet-stream');

  return {
    base64: buffer.toString('base64'),
    mediaType,
  };
}

/**
 * Download vehicle history reports sequentially for AI multimodal input.
 * Buffers are scoped per iteration to avoid memory spikes.
 */
export async function downloadHistoryReportsForAi(
  vehicleId: string,
  vehicle: {
    historyReportUrls?: string[];
    documents?: { carfaxReport?: string };
  }
): Promise<HistoryReportFileForAi[]> {
  const urls = resolveHistoryReportUrls(vehicle);

  if (urls.length === 0) {
    throw new Error('No history reports uploaded for this vehicle');
  }

  if (urls.length > MAX_FILES) {
    throw new Error(`Too many history reports (max ${MAX_FILES})`);
  }

  const files: HistoryReportFileForAi[] = [];

  for (const url of urls) {
    if (!isAllowedHistoryReportUrl(vehicle, url)) {
      throw new Error('History report URL not allowed');
    }

    const file = url.startsWith('data:')
      ? await downloadDataUri(url)
      : await downloadGcsFile(vehicleId, url);

    files.push(file);
  }

  return files;
}
