import { createGoogle } from '@ai-sdk/google';

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const IMAGEN_MODEL = 'imagen-4.0-fast-generate-001';

export function getGoogleProvider() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
  }
  return createGoogle({ apiKey });
}

export function getGeminiTextModel() {
  return getGoogleProvider()(GEMINI_TEXT_MODEL);
}

export function getImagenModel() {
  return getGoogleProvider().image(IMAGEN_MODEL);
}
