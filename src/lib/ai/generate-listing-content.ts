import { generateObject, type FilePart, type TextPart } from 'ai';
import type { DealerProspect } from '../../schemas';
import type { VinDecodeResult } from '../vin-decoder';
import {
  extractBase64FromDataUri,
  extractMimeTypeFromDataUri,
} from '../sticker-file';
import {
  AiListingContentSchema,
  type AiListingContent,
  type PartialAiListingContent,
} from './ai-listing-content-schema';
import { logAiGenerationError } from './ai-errors';
import { GEMINI_TEXT_MODEL, getGeminiTextModel, TEXT_GENERATION_TIMEOUT_MS } from './gemini';
import {
  extractPartialFromGenerationError,
  isFullAiListingContent,
} from './parse-partial-listing-content';
import { STICKER_SOURCE_OF_TRUTH_DIRECTIVE } from './sticker-prompt';

export type { AiListingContent, PartialAiListingContent } from './ai-listing-content-schema';
export { AiListingContentSchema } from './ai-listing-content-schema';

const MULTIMODAL_GENERATION_TIMEOUT_MS = 120_000;

export type GenerateListingContentResult = {
  content: PartialAiListingContent;
  partial: boolean;
  fieldErrors: string[];
};

function buildSystemPrompt(stickerFile?: string): string {
  const lines = [
    'You are an automotive expert generating a complete vehicle listing.',
    'Your JSON output must strictly match the required schema.',
  ];

  if (stickerFile) {
    lines.push(STICKER_SOURCE_OF_TRUTH_DIRECTIVE);
  }

  return lines.join(' ');
}

function buildUserPromptInner(
  decoded: VinDecodeResult,
  prospect: DealerProspect | undefined,
  hasStickerFile: boolean
): string {
  const prospectLine = prospect
    ? `Personalize the seller's note for customer ${prospect.firstName} ${prospect.lastName}.`
    : 'Write copy for a private seller listing.';

  const monroneyLines = hasStickerFile
    ? [
        '- monroney: extract baseMsrp, destinationCharge, totalMsrp, options, and standardEquipment verbatim from the uploaded window sticker',
        '- preserve exact standardEquipment category names and bullet text from the sticker',
        '- optional equipment line items must match the sticker labels and prices exactly',
      ]
    : [
        '- monroney: baseMsrp, destinationCharge, totalMsrp, options (packages/options/fees), standardEquipment',
        '- monroney options must reflect factory packages only — never marketing taglines or listing copy',
        '- include factory style packages when applicable (e.g. Night Edition Package, XLT Equipment Group)',
        '- Use ONLY plausible factory options, packages, and MSRP values for this exact year/make/model/trim',
      ];

  return [
    prospectLine,
    ...monroneyLines,
    '- monroney.warranty: factory warranty coverage lines and optional powertrain badge',
    '- monroney.partsContent: AALA-style parts content (US/Canadian %, major foreign sources, engine/transmission origin)',
    '- do NOT include monroney.styleLine, factorySpecs, epa, safetyRatings, assembly, or manufacturerInfo — those are added server-side',
    '- mechanicalIntro and 1 to 3 mechanicalItems',
    '- highlights: provide 1 to 4 vehicle highlight items',
    '- marketValuation: contextText, dealerRealityText, kbbText, justificationText',
    'Suggested price should reflect fair private-party value for the suggested mileage — not MSRP.',
    'Suggested mileage should be realistic for the vehicle year unless prospect context implies otherwise.',
    'Return marketing copy that is confident, factual, and ready to publish.',
    '',
    'VIN decode data (authoritative for year/make/model/trim when no sticker is provided):',
    JSON.stringify(decoded, null, 2),
  ].join('\n');
}

function buildUserMessageContent(
  decoded: VinDecodeResult,
  prospect: DealerProspect | undefined,
  stickerFile?: string
): Array<TextPart | FilePart> {
  const parts: Array<TextPart | FilePart> = [
    {
      type: 'text',
      text: buildUserPromptInner(decoded, prospect, Boolean(stickerFile)),
    },
  ];

  if (stickerFile) {
    parts.push({
      type: 'file',
      data: extractBase64FromDataUri(stickerFile),
      mediaType: extractMimeTypeFromDataUri(stickerFile),
    });
  }

  return parts;
}

function toResult(
  content: PartialAiListingContent,
  fieldErrors: string[] = []
): GenerateListingContentResult {
  const partial = !isFullAiListingContent(content);
  return { content, partial, fieldErrors };
}

function tryRecoverPartial(error: unknown): GenerateListingContentResult | null {
  const recovered = extractPartialFromGenerationError(error);
  if (!recovered) return null;
  return toResult(recovered.content, recovered.fieldErrors);
}

export async function generateListingContent(
  decoded: VinDecodeResult,
  prospect?: DealerProspect,
  stickerFile?: string
): Promise<GenerateListingContentResult> {
  const timeoutMs = stickerFile ? MULTIMODAL_GENERATION_TIMEOUT_MS : TEXT_GENERATION_TIMEOUT_MS;

  const run = () =>
    generateObject({
      model: getGeminiTextModel(),
      schema: AiListingContentSchema,
      instructions: buildSystemPrompt(stickerFile),
      messages: [
        {
          role: 'user',
          content: buildUserMessageContent(decoded, prospect, stickerFile),
        },
      ],
      abortSignal: AbortSignal.timeout(timeoutMs),
    });

  try {
    const result = await run();
    return toResult(result.object);
  } catch (firstError) {
    const partial = tryRecoverPartial(firstError);
    if (partial) {
      logAiGenerationError('generateListingContent partial recovery after failure', firstError);
      return partial;
    }

    logAiGenerationError('generateListingContent retry after failure', firstError);
    try {
      const result = await run();
      return toResult(result.object);
    } catch (retryError) {
      const retryPartial = tryRecoverPartial(retryError);
      if (retryPartial) {
        logAiGenerationError('generateListingContent partial recovery after retry failure', retryError);
        return retryPartial;
      }
      throw retryError;
    }
  }
}

export { GEMINI_TEXT_MODEL };
