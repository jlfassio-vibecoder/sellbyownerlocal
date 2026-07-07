import type { APIRoute } from 'astro';
import {
  AuthError,
  ForbiddenError,
  assertVehicleOwner,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../lib/auth';
import { db } from '../../../lib/firebase-admin';
import {
  ALLOWED_VEHICLE_UPLOAD_MIME_TYPES,
  uploadVehicleFile,
} from '../../../lib/storage-upload';
import { UploadResponseSchema, VehicleResponseSchema } from '../../../schemas';
import { FieldValue } from 'firebase-admin/firestore';

const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_GALLERY_FILE_SIZE = 20 * 1024 * 1024;

const GALLERY_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

type UploadPurpose =
  | 'document'
  | 'gallery'
  | 'original_sticker'
  | 'history_report'
  | 'kbb_report'
  | 'smog_certificate';

function parsePurpose(raw: FormDataEntryValue | null): UploadPurpose {
  if (raw === 'gallery') return 'gallery';
  if (raw === 'original_sticker') return 'original_sticker';
  if (raw === 'history_report') return 'history_report';
  if (raw === 'kbb_report') return 'kbb_report';
  if (raw === 'smog_certificate') return 'smog_certificate';
  return 'document';
}

function inferContentType(file: File): string | null {
  if (file.type && ALLOWED_VEHICLE_UPLOAD_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';

  return file.type || null;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireSeller(request, cookies);

    const formData = await request.formData();
    const file = formData.get('file');
    const vehicleId = formData.get('vehicleId');
    const purpose = parsePurpose(formData.get('purpose'));

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

    const contentType = inferContentType(file);
    if (!contentType || !ALLOWED_VEHICLE_UPLOAD_MIME_TYPES.has(contentType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Allowed: PDF, PNG, JPEG, WebP' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (purpose === 'gallery' && !GALLERY_MIME_TYPES.has(contentType)) {
      return new Response(
        JSON.stringify({ error: 'Gallery uploads must be PNG, JPEG, or WebP images' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const folder =
      purpose === 'gallery'
        ? 'gallery'
        : purpose === 'original_sticker'
          ? 'original_sticker'
          : purpose === 'history_report'
            ? 'history_report'
            : purpose === 'kbb_report'
              ? 'kbb_report'
              : purpose === 'smog_certificate'
                ? 'smog_certificate'
                : 'documents';

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadVehicleFile({
      vehicleId: trimmedVehicleId,
      buffer,
      contentType,
      folder,
    });

    if (purpose === 'original_sticker') {
      await db()
        .collection('vehicles')
        .doc(trimmedVehicleId)
        .update({
          originalStickerUrl: url,
          'documents.windowSticker': FieldValue.delete(),
        });
    }

    if (purpose === 'history_report') {
      await db()
        .collection('vehicles')
        .doc(trimmedVehicleId)
        .update({
          historyReportUrls: FieldValue.arrayUnion(url),
          'documents.carfaxReport': FieldValue.delete(),
        });
    }

    if (purpose === 'kbb_report') {
      await db()
        .collection('vehicles')
        .doc(trimmedVehicleId)
        .update({
          kbbReportUrl: url,
          'documents.kbbReport': FieldValue.delete(),
        });
    }

    if (purpose === 'smog_certificate') {
      await db()
        .collection('vehicles')
        .doc(trimmedVehicleId)
        .update({
          smogCertificateUrls: FieldValue.arrayUnion(url),
          smogCertificateUrl: FieldValue.delete(),
          'documents.smogReport': FieldValue.delete(),
        });
    }

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
