import { generateImage } from 'ai';
import type { VinDecodeResult } from '../vin-decoder';
import { getImagenModel, IMAGE_GENERATION_TIMEOUT_MS, IMAGEN_MODEL } from './gemini';

export interface HeroImageBufferResult {
  buffer: Buffer;
  mimeType: string;
}

function buildHeroPrompt(decoded: VinDecodeResult, exteriorColor: string): string {
  return [
    `Pristine ${decoded.year} ${decoded.make} ${decoded.model} ${decoded.trim} in ${exteriorColor}, modern studio setting, dramatic lighting.`,
    'Three-quarter front angle, photorealistic dealer hero image, no people, no text, no watermark.',
  ].join(' ');
}

export async function generateHeroImageBuffer(
  decoded: VinDecodeResult,
  exteriorColor: string
): Promise<HeroImageBufferResult> {
  const prompt = buildHeroPrompt(decoded, exteriorColor);

  const { image } = await generateImage({
    model: getImagenModel(),
    prompt,
    aspectRatio: '16:9',
    abortSignal: AbortSignal.timeout(IMAGE_GENERATION_TIMEOUT_MS),
  });

  return {
    buffer: Buffer.from(image.base64, 'base64'),
    mimeType: 'image/png',
  };
}

export { IMAGEN_MODEL };
