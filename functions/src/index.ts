import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { defineSecret } from 'firebase-functions/params';
import { onObjectFinalized } from 'firebase-functions/v2/storage';

if (getApps().length === 0) {
  initializeApp();
}

const geminiApiKey = defineSecret('GEMINI_API_KEY');

const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ?? 'ai-workout-generator-hub.firebasestorage.app';

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ?? 'ai-studio-ram1500-a6aad1c3-783c-48e0-a179-f80c48018571';

const GEMINI_SYSTEM_PROMPT =
  'You are an expert data extractor. Read this wholesale apparel catalog PDF. Extract every distinct style into a JSON array of objects. Each object must have these exact keys: title (string), brand (string, guess if not explicit), price (number), description (string), material (string), sizes (array of strings), colors (array of strings), prePackRatio (string). Do not include any other text.';

const IMAGE_OCR_PROMPT =
  "You are a wholesale apparel assistant. Look at this image and extract the primary item number, style code, or model number (for example, 'HK98420'). Return ONLY the alphanumeric item code as a plain string. Do not include any other text, markdown, or explanation.";

const BATCH_CHUNK_SIZE = 400;

interface ExtractedCatalogItem {
  title: string;
  brand: string;
  price: number;
  description: string;
  material: string;
  sizes: string[];
  colors: string[];
  prePackRatio: string;
}

function getClothingDb() {
  return getFirestore(getApp(), FIRESTORE_DATABASE_ID);
}

function buildPublicStorageUrl(bucketName: string, objectPath: string): string {
  return `https://storage.googleapis.com/${bucketName}/${objectPath}`;
}

function sanitizeItemCode(raw: string): string {
  return raw
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function listingContainsCode(
  title: unknown,
  description: unknown,
  code: string
): boolean {
  const haystack = `${String(title ?? '')} ${String(description ?? '')}`.toUpperCase();
  return haystack.includes(code);
}

interface ImageMatchResultInput {
  sellerId: string;
  filename: string;
  itemCode: string;
  status: 'matched' | 'unmatched' | 'ocr_failed';
  message: string;
  listingId?: string;
  listingTitle?: string;
  imageUrl?: string;
}

async function writeImageMatchResult(input: ImageMatchResultInput): Promise<void> {
  const db = getClothingDb();
  const docId = `${input.sellerId}_${input.filename}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  await db.collection('apparel_image_matches').doc(docId).set({
    sellerId: input.sellerId,
    filename: input.filename,
    itemCode: input.itemCode,
    status: input.status,
    message: input.message,
    listingId: input.listingId ?? null,
    listingTitle: input.listingTitle ?? null,
    imageUrl: input.imageUrl ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

function parseExtractedItems(raw: unknown): ExtractedCatalogItem[] {
  if (!Array.isArray(raw)) {
    throw new Error('Gemini response is not a JSON array');
  }

  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Item at index ${index} is not an object`);
    }
    const record = item as Record<string, unknown>;
    return {
      title: String(record.title ?? '').trim(),
      brand: String(record.brand ?? '').trim(),
      price: Number(record.price),
      description: String(record.description ?? '').trim(),
      material: String(record.material ?? '').trim(),
      sizes: Array.isArray(record.sizes) ? record.sizes.map(String) : [],
      colors: Array.isArray(record.colors) ? record.colors.map(String) : [],
      prePackRatio: String(record.prePackRatio ?? '').trim(),
    };
  });
}

async function writeDraftListings(
  items: ExtractedCatalogItem[],
  sellerId: string,
  pdfLineSheetUrl: string
): Promise<number> {
  const db = getClothingDb();
  let written = 0;

  for (let offset = 0; offset < items.length; offset += BATCH_CHUNK_SIZE) {
    const chunk = items.slice(offset, offset + BATCH_CHUNK_SIZE);
    const batch = db.batch();

    for (const item of chunk) {
      const ref = db.collection('clothing_listings').doc();
      batch.set(ref, {
        title: item.title,
        brand: item.brand,
        price: item.price,
        description: item.description,
        material: item.material,
        sizes: item.sizes,
        colors: item.colors,
        prePackRatio: item.prePackRatio,
        galleryPhotos: [],
        sellerId,
        status: 'draft',
        createdAt: FieldValue.serverTimestamp(),
        pdfLineSheetUrl,
      });
    }

    await batch.commit();
    written += chunk.length;
  }

  return written;
}

export const processApparelCatalog = onObjectFinalized(
  {
    region: 'asia-southeast1',
    bucket: STORAGE_BUCKET,
    secrets: [geminiApiKey],
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name ?? '';
    const contentType = object.contentType ?? '';

    if (!filePath.startsWith('catalogs/') || contentType !== 'application/pdf') {
      return;
    }

    const pathParts = filePath.split('/');
    const sellerId = pathParts[1];
    const filename = pathParts.slice(2).join('/');

    if (!sellerId || !filename) {
      console.warn('Invalid catalog path:', filePath);
      return;
    }

    const bucketName = object.bucket;
    if (!bucketName) {
      console.error('Missing bucket on storage event');
      return;
    }

    console.log(`Gemini extraction starting for ${filename} (seller: ${sellerId})`);

    try {
      const bucket = getStorage().bucket(bucketName);
      const [buffer] = await bucket.file(filePath).download();

      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent([
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'application/pdf',
          },
        },
      ]);

      const responseText = result.response.text();
      if (!responseText) {
        throw new Error('Gemini returned an empty response');
      }

      const extractedItems = parseExtractedItems(JSON.parse(responseText));
      if (extractedItems.length === 0) {
        console.warn('No catalog items extracted from PDF:', filePath);
        return;
      }

      console.log('Writing extracted items to clothing_listings');

      const pdfLineSheetUrl = `gs://${bucketName}/${filePath}`;
      const written = await writeDraftListings(extractedItems, sellerId, pdfLineSheetUrl);

      console.log(
        `Successfully wrote ${written} draft listing(s) for seller ${sellerId} from ${filename}`
      );
    } catch (error) {
      console.error('processApparelCatalog failed:', error);
      throw error;
    }
  }
);

export const matchApparelImage = onObjectFinalized(
  {
    region: 'asia-southeast1',
    bucket: STORAGE_BUCKET,
    secrets: [geminiApiKey],
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name ?? '';
    const contentType = object.contentType ?? '';

    if (!filePath.startsWith('apparel-images/staging/') || !contentType.startsWith('image/')) {
      return;
    }

    const pathParts = filePath.split('/');
    const sellerId = pathParts[2];
    const filename = pathParts.slice(3).join('/');

    if (!sellerId || !filename) {
      console.warn('Invalid apparel image staging path:', filePath);
      return;
    }

    const bucketName = object.bucket;
    if (!bucketName) {
      console.error('Missing bucket on storage event');
      return;
    }

    console.log(`Image OCR matching starting for ${filename} (seller: ${sellerId})`);

    try {
      const bucket = getStorage().bucket(bucketName);
      const gcsFile = bucket.file(filePath);
      const [buffer] = await gcsFile.download();

      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: IMAGE_OCR_PROMPT,
      });

      const result = await model.generateContent([
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: contentType,
          },
        },
      ]);

      const responseText = result.response.text();
      if (!responseText) {
        console.warn('Gemini returned empty OCR for image:', filePath);
        await writeImageMatchResult({
          sellerId,
          filename,
          itemCode: '',
          status: 'ocr_failed',
          message: 'Could not extract a style code from this image.',
        });
        return;
      }

      const itemCode = sanitizeItemCode(responseText);
      if (!itemCode) {
        console.warn('No item code extracted from image:', filePath, responseText);
        await writeImageMatchResult({
          sellerId,
          filename,
          itemCode: '',
          status: 'ocr_failed',
          message: 'Could not extract a style code from this image.',
        });
        return;
      }

      console.log(`Extracted item code "${itemCode}" from ${filename}`);

      const db = getClothingDb();
      const draftSnapshot = await db
        .collection('clothing_listings')
        .where('sellerId', '==', sellerId)
        .where('status', '==', 'draft')
        .get();

      const match = draftSnapshot.docs.find((doc) => {
        const data = doc.data();
        return listingContainsCode(data.title, data.description, itemCode);
      });

      if (!match) {
        console.warn(
          `No draft listing match for item code "${itemCode}" (seller: ${sellerId}, image: ${filename})`
        );
        await writeImageMatchResult({
          sellerId,
          filename,
          itemCode,
          status: 'unmatched',
          message: `No draft listing found for style code ${itemCode}.`,
        });
        return;
      }

      await gcsFile.makePublic();
      const publicUrl = buildPublicStorageUrl(bucketName, filePath);

      await match.ref.update({
        galleryPhotos: FieldValue.arrayUnion(publicUrl),
      });

      await writeImageMatchResult({
        sellerId,
        filename,
        itemCode,
        status: 'matched',
        listingId: match.id,
        listingTitle: String(match.data().title ?? ''),
        imageUrl: publicUrl,
        message: `Matched ${itemCode} to “${String(match.data().title ?? match.id)}”.`,
      });

      console.log(
        `Matched item code "${itemCode}" to listing ${match.id}; appended ${publicUrl}`
      );
    } catch (error) {
      console.error('matchApparelImage failed:', error);
      try {
        await writeImageMatchResult({
          sellerId,
          filename,
          itemCode: '',
          status: 'ocr_failed',
          message: 'Image matching failed. Please try uploading again.',
        });
      } catch (writeError) {
        console.error('Failed to write image match error result:', writeError);
      }
      throw error;
    }
  }
);
