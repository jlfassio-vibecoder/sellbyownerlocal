import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../lib/auth';
import { db, storageBucket } from '../../../lib/firebase-admin';
import { UploadResponseSchema, VehicleResponseSchema } from '../../../schemas';

const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_GALLERY_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const GALLERY_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireSeller(request, cookies);

    const formData = await request.formData();
    const file = formData.get('file');
    const vehicleId = formData.get('vehicleId');
    const purposeRaw = formData.get('purpose');
    const purpose = purposeRaw === 'gallery' ? 'gallery' : 'document';

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof vehicleId !== 'string' || !vehicleId.trim()) {
      return new Response(JSON.stringify({ error: 'vehicleId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const trimmedVehicleId = vehicleId.trim();

    const doc = await db().collection('vehicles').doc(trimmedVehicleId).get();

    if (!doc.exists) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const raw = { id: doc.id, ...doc.data() };
    const vehicleParsed = VehicleResponseSchema.safeParse(raw);

    if (!vehicleParsed.success) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      assertVehicleOwner(session.uid, vehicleParsed.data.sellerId);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return forbiddenResponse();
      }
      throw error;
    }

    const maxFileSize = purpose === 'gallery' ? MAX_GALLERY_FILE_SIZE : MAX_DOCUMENT_FILE_SIZE;
    const maxFileSizeLabel = purpose === 'gallery' ? '20MB' : '5MB';

    if (file.size > maxFileSize) {
      return new Response(JSON.stringify({ error: `File size exceeds ${maxFileSizeLabel} limit` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Allowed: PDF, PNG, JPEG, WebP' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (purpose === 'gallery' && !GALLERY_MIME_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Gallery uploads must be PNG, JPEG, or WebP images' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ext = MIME_TO_EXT[file.type] ?? 'bin';
    const folder = purpose === 'gallery' ? 'gallery' : 'documents';
    const filename = `vehicles/${trimmedVehicleId}/${folder}/${Date.now()}-${randomUUID()}.${ext}`;
    const bucket = storageBucket();
    const gcsFile = bucket.file(filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await gcsFile.save(buffer, {
      metadata: { contentType: file.type },
    });
    // Uploaded files are public on listing pages; UBLA buckets rely on bucket IAM instead of makePublic().
    await makeObjectPublicIfSupported(gcsFile);

    const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    const response = UploadResponseSchema.parse({ url });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('POST /api/seller/uploads failed', error);
    return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
