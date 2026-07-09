import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import {
  AuthError,
  ForbiddenError,
  forbiddenResponse,
  requireSeller,
  unauthorizedResponse,
} from '../../../../lib/auth';
import { db, storageBucket } from '../../../../lib/firebase-admin';
import { buildPublicStorageUrl } from '../../../../lib/storage-upload';
import type { ApparelFilterItem } from '../../../../lib/apparel';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const CAD_EXTRACTION_PROMPT =
  'Analyze this CAD apparel spec image. Extract the item details into a JSON object with these exact keys: title (string), brand (string, guess if not explicit), price (number), description (string), material (string), sizes (array of strings), colors (array of strings), itemCode (string, alphanumeric model number). If a field is missing, return an empty string or empty array. Return ONLY valid JSON.';

const ExtractedCadSchema = z.object({
  title: z.union([z.string(), z.number()]).transform((value) => String(value)),
  brand: z.union([z.string(), z.number()]).transform((value) => String(value)),
  price: z.union([z.number(), z.string()]),
  description: z.union([z.string(), z.number()]).transform((value) => String(value)),
  material: z.union([z.string(), z.number()]).transform((value) => String(value)),
  sizes: z.array(z.union([z.string(), z.number()]).transform((value) => String(value))),
  colors: z.array(z.union([z.string(), z.number()]).transform((value) => String(value))),
  itemCode: z.union([z.string(), z.number()]).transform((value) => String(value)),
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function sanitizeItemCode(raw: string): string {
  return raw
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function buildTitleWithItemCode(title: string, itemCode: string): string {
  const trimmedTitle = title.trim();
  const code = sanitizeItemCode(itemCode);
  if (!code) return trimmedTitle;
  if (trimmedTitle.toUpperCase().includes(code)) return trimmedTitle;
  return trimmedTitle ? `${code} - ${trimmedTitle}` : code;
}

function inferImageContentType(file: File): string | null {
  if (file.type && ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';

  return null;
}

function parseExtractedCad(raw: unknown) {
  const parsed = ExtractedCadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Gemini returned invalid CAD extraction JSON');
  }

  const price = typeof parsed.data.price === 'number' ? parsed.data.price : Number(parsed.data.price);
  return {
    title: parsed.data.title.trim(),
    brand: parsed.data.brand.trim(),
    price: Number.isFinite(price) && price > 0 ? price : 0,
    description: parsed.data.description.trim(),
    material: parsed.data.material.trim(),
    sizes: parsed.data.sizes.map((value) => value.trim()).filter(Boolean),
    colors: parsed.data.colors.map((value) => value.trim()).filter(Boolean),
    itemCode: parsed.data.itemCode.trim(),
  };
}

async function uploadApparelImage(
  sellerId: string,
  listingId: string,
  buffer: Buffer,
  contentType: string,
  filename: string
): Promise<string> {
  const objectPath = `apparel-images/${sellerId}/${listingId}/${sanitizeFilename(filename)}`;
  const bucket = storageBucket();
  const gcsFile = bucket.file(objectPath);

  await gcsFile.save(buffer, {
    metadata: {
      contentType,
      contentDisposition: 'inline',
    },
  });

  try {
    await gcsFile.makePublic();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/uniform bucket-level access/i.test(message)) {
      throw error;
    }
  }

  return buildPublicStorageUrl(bucket.name, objectPath);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await requireSeller(request, cookies);
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return jsonResponse({ error: 'Internal Server Error: AI Service Unavailable' }, 500);
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return jsonResponse({ error: 'No image file provided' }, 400);
    }

    const contentType = inferImageContentType(file);
    if (!contentType) {
      return jsonResponse({ error: 'File must be a PNG, JPEG, or WebP image' }, 400);
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return jsonResponse({ error: 'File size exceeds 10MB limit' }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent([
      { text: CAD_EXTRACTION_PROMPT },
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: contentType,
        },
      },
    ]);

    const responseText = result.response.text().trim();
    let extractedRaw: unknown;
    try {
      extractedRaw = JSON.parse(responseText);
    } catch {
      return jsonResponse({ error: 'Failed to parse CAD extraction response' }, 502);
    }

    const extracted = parseExtractedCad(extractedRaw);
    const title = buildTitleWithItemCode(extracted.title, extracted.itemCode);
    const ref = db().collection('clothing_listings').doc();
    const imageUrl = await uploadApparelImage(
      session.uid,
      ref.id,
      buffer,
      contentType,
      file.name
    );

    const listingData = {
      title: title || 'Untitled Item',
      brand: extracted.brand || 'Unknown',
      price: extracted.price,
      description: extracted.description || title || 'CAD extracted item',
      material: extracted.material,
      sizes: extracted.sizes,
      colors: extracted.colors.length > 0 ? extracted.colors : undefined,
      galleryPhotos: [imageUrl],
      sellerId: session.uid,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      isFeatured: false,
      isSale: false,
    };

    await ref.set(listingData);

    const item: ApparelFilterItem = {
      id: ref.id,
      title: listingData.title,
      brand: listingData.brand,
      price: listingData.price,
      description: listingData.description,
      status: 'draft',
      galleryPhotos: listingData.galleryPhotos,
      material: listingData.material,
      sizes: listingData.sizes,
      colors: listingData.colors,
      isFeatured: false,
      isSale: false,
    };

    return jsonResponse({ success: true, item }, 200);
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse();
    }
    console.error('POST /api/seller/apparel/extract-cad-item failed', error);
    return jsonResponse({ error: 'Failed to extract CAD item' }, 500);
  }
};
