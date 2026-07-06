import { createGoogle } from '@ai-sdk/google';
import { MissingGoogleAiApiKeyError } from './ai-errors';

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const GEMINI_PRO_MODEL = 'gemini-2.5-pro';
export const IMAGEN_MODEL = 'imagen-4.0-fast-generate-001';

export const TEXT_GENERATION_TIMEOUT_MS = 60_000;
export const MARKET_RESEARCH_TIMEOUT_MS = 90_000;
export const IMAGE_GENERATION_TIMEOUT_MS = 90_000;

export function getGoogleProvider() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new MissingGoogleAiApiKeyError();
  }
  return createGoogle({ apiKey });
}

export function getGeminiTextModel() {
  return getGoogleProvider()(GEMINI_TEXT_MODEL);
}

export function getGeminiProModel() {
  return getGoogleProvider()(GEMINI_PRO_MODEL);
}

export function getImagenModel() {
  return getGoogleProvider().image(IMAGEN_MODEL);
}
