import { randomUUID } from 'node:crypto';
import { storageBucket } from './firebase-admin';

export type VehicleUploadFolder =
  | 'documents'
  | 'gallery'
  | 'original_sticker'
  | 'history_report'
  | 'kbb_report'
  | 'smog_certificate';

export const ALLOWED_VEHICLE_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** UBLA buckets reject per-object ACLs; public read must be set at bucket IAM instead. */
function isUniformBucketLevelAccessError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (/uniform bucket-level access/i.test(message)) {
    return true;
  }

  const apiError = error as { code?: number; errors?: Array<{ message?: string; reason?: string }> };
  if (apiError.code === 400) {
    return (
      apiError.errors?.some(
        (entry) =>
          /uniform bucket-level access/i.test(entry.message ?? '') ||
          (entry.reason === 'invalid' && /access control/i.test(entry.message ?? ''))
      ) ?? false
    );
  }

  return false;
}

async function makeObjectPublicIfSupported(
  gcsFile: ReturnType<ReturnType<typeof storageBucket>['file']>
): Promise<void> {
  try {
    await gcsFile.makePublic();
  } catch (error) {
    if (isUniformBucketLevelAccessError(error)) {
      return;
    }
    throw error;
  }
}

export interface UploadVehicleFileOptions {
  vehicleId: string;
  buffer: Buffer;
  contentType: string;
  folder: VehicleUploadFolder;
}

export async function uploadVehicleFile({
  vehicleId,
  buffer,
  contentType,
  folder,
}: UploadVehicleFileOptions): Promise<string> {
  const ext = MIME_TO_EXT[contentType] ?? 'bin';
  const objectPath = `vehicles/${vehicleId}/${folder}/${Date.now()}-${randomUUID()}.${ext}`;
  const bucket = storageBucket();
  const gcsFile = bucket.file(objectPath);

  await gcsFile.save(buffer, {
    metadata: {
      contentType,
      contentDisposition: 'inline',
    },
  });
  // Uploaded files are public on listing pages; UBLA buckets rely on bucket IAM instead of makePublic().
  await makeObjectPublicIfSupported(gcsFile);

  return buildPublicStorageUrl(bucket.name, objectPath);
}

/** Firebase-compatible public download URL (works with bucket IAM public read). */
export function buildPublicStorageUrl(bucketName: string, objectPath: string): string {
  return `https://storage.googleapis.com/${bucketName}/${objectPath}`;
}

/** Alternate Firebase REST download URL (kept for legacy records). */
export function buildFirebaseStorageDownloadUrl(bucketName: string, objectPath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media`;
}
