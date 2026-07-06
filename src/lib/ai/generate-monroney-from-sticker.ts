import { generateObject, type FilePart, type TextPart } from 'ai';
import type { z } from 'zod';
import type { VinDecodeResult } from '../vin-decoder';
import {
  extractBase64FromDataUri,
  extractMimeTypeFromDataUri,
} from '../sticker-file';
import {
  AiMonroneyLenientSchema,
  AiMonroneySchema,
} from './ai-listing-content-schema';
import { logAiGenerationError } from './ai-errors';
import { GEMINI_TEXT_MODEL, getGeminiTextModel } from './gemini';
import {
  extractPartialMonroneyFromGenerationError,
  isFullAiMonroneyContent,
} from './parse-partial-monroney-content';
import { MONRONEY_FROM_STICKER_USER_LINES, STICKER_SOURCE_OF_TRUTH_DIRECTIVE } from './sticker-prompt';

const MULTIMODAL_GENERATION_TIMEOUT_MS = 120_000;

type AiMonroneyLenient = z.infer<typeof AiMonroneyLenientSchema>;

export type GenerateMonroneyFromStickerResult = {
  monroney: AiMonroneyLenient;
  partial: boolean;
  fieldErrors: string[];
};

function buildSystemPrompt(): string {
  return [
    'You are an expert at reading factory Monroney window stickers.',
    'Your JSON output must strictly match the required Monroney schema.',
    STICKER_SOURCE_OF_TRUTH_DIRECTIVE,
  ].join(' ');
}

function buildUserPrompt(decoded?: VinDecodeResult): string {
  const lines = [...MONRONEY_FROM_STICKER_USER_LINES];

  if (decoded) {
    lines.push(
      '',
      'VIN decode data (use only for cross-reference; sticker text wins on conflicts):',
      JSON.stringify(decoded, null, 2)
    );
  }

  return lines.join('\n');
}

function buildUserMessageContent(
  stickerFile: string,
  decoded?: VinDecodeResult
): Array<TextPart | FilePart> {
  return [
    { type: 'text', text: buildUserPrompt(decoded) },
    {
      type: 'file',
      data: extractBase64FromDataUri(stickerFile),
      mediaType: extractMimeTypeFromDataUri(stickerFile),
    },
  ];
}

function toResult(monroney: AiMonroneyLenient, fieldErrors: string[] = []): GenerateMonroneyFromStickerResult {
  return {
    monroney,
    partial: !isFullAiMonroneyContent(monroney),
    fieldErrors,
  };
}

function tryRecoverPartial(error: unknown): GenerateMonroneyFromStickerResult | null {
  const recovered = extractPartialMonroneyFromGenerationError(error);
  if (!recovered) return null;
  return toResult(recovered.content, recovered.fieldErrors);
}

export async function generateMonroneyFromSticker(
  stickerFile: string,
  decoded?: VinDecodeResult
): Promise<GenerateMonroneyFromStickerResult> {
  const run = () =>
    generateObject({
      model: getGeminiTextModel(),
      schema: AiMonroneySchema,
      instructions: buildSystemPrompt(),
      messages: [
        { role: 'user', content: buildUserMessageContent(stickerFile, decoded) },
      ],
      abortSignal: AbortSignal.timeout(MULTIMODAL_GENERATION_TIMEOUT_MS),
    });

  try {
    const result = await run();
    return toResult(result.object);
  } catch (firstError) {
    const partial = tryRecoverPartial(firstError);
    if (partial) {
      logAiGenerationError('generateMonroneyFromSticker partial recovery after failure', firstError);
      return partial;
    }

    logAiGenerationError('generateMonroneyFromSticker retry after failure', firstError);
    try {
      const result = await run();
      return toResult(result.object);
    } catch (retryError) {
      const retryPartial = tryRecoverPartial(retryError);
      if (retryPartial) {
        logAiGenerationError(
          'generateMonroneyFromSticker partial recovery after retry failure',
          retryError
        );
        return retryPartial;
      }
      throw retryError;
    }
  }
}

export { GEMINI_TEXT_MODEL };
