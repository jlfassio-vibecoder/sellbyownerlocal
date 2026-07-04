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

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireSeller(request, cookies);

    const formData = await request.formData();
    const file = formData.get('file');
    const vehicleId = formData.get('vehicleId');

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

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File size exceeds 5MB limit' }), {
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

    const ext = MIME_TO_EXT[file.type] ?? 'bin';
    const filename = `vehicles/${trimmedVehicleId}/documents/${Date.now()}-${randomUUID()}.${ext}`;
    const bucket = storageBucket();
    const gcsFile = bucket.file(filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await gcsFile.save(buffer, {
      metadata: { contentType: file.type },
    });
    await gcsFile.makePublic();

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
