import { randomUUID } from 'node:crypto';
import { generateImage } from 'ai';
import { storageBucket } from '../firebase-admin';
import type { VinDecodeResult } from '../vin-decoder';
import { getImagenModel, IMAGEN_MODEL } from './gemini';

function isUniformBucketLevelAccessError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /uniform bucket-level access/i.test(message);
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

function buildHeroPrompt(decoded: VinDecodeResult, exteriorColor: string): string {
  return [
    `Professional automotive studio photograph of a pristine ${decoded.year} ${decoded.make} ${decoded.model} ${decoded.trim}.`,
    `Exterior color: ${exteriorColor}.`,
    `Body style: ${decoded.bodyClass}.`,
    'Three-quarter front angle, clean white studio background, showroom lighting, no people, no text, no watermark.',
    'Photorealistic, high detail, like a dealer hero image.',
  ].join(' ');
}

export async function generateAndUploadHeroImage(
  vehicleId: string,
  decoded: VinDecodeResult,
  exteriorColor: string
): Promise<string> {
  const prompt = buildHeroPrompt(decoded, exteriorColor);

  const { image } = await generateImage({
    model: getImagenModel(),
    prompt,
    aspectRatio: '16:9',
  });

  const buffer = Buffer.from(image.base64, 'base64');
  const filename = `vehicles/${vehicleId}/ai-hero/${Date.now()}-${randomUUID()}.png`;
  const bucket = storageBucket();
  const gcsFile = bucket.file(filename);

  await gcsFile.save(buffer, {
    metadata: { contentType: 'image/png' },
  });
  await makeObjectPublicIfSupported(gcsFile);

  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

export { IMAGEN_MODEL };
