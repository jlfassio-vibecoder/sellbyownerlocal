import { z } from 'zod';
import { generateObject } from 'ai';
import {
  MechanicalItemSchema,
  MonroneySchema,
  VehicleHighlightSchema,
} from '../../schemas';
import type { DealerProspect } from '../../schemas';
import type { VinDecodeResult } from '../vin-decoder';
import { GEMINI_TEXT_MODEL, getGeminiTextModel } from './gemini';

export const AiListingContentSchema = z.object({
  description: z.string().min(1),
  subtitle: z.string().min(1),
  suggestedPrice: z.number().positive(),
  suggestedMileage: z.number().int().nonnegative(),
  exteriorColor: z.string().min(1),
  interiorColor: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  features: z.array(z.string().min(1)).min(3),
  monroney: MonroneySchema,
  highlights: z.array(VehicleHighlightSchema).length(4),
  mechanicalIntro: z.string().min(1),
  mechanicalItems: z.array(MechanicalItemSchema).length(3),
  peaceOfMindText: z.string().min(1),
  maintenanceText: z.string().min(1),
  utilityTowingText: z.string().min(1),
  luxuryOptionsText: z.string().min(1),
  ctaText: z.string().min(1),
  marketValuation: z.object({
    contextText: z.string().min(1),
    dealerRealityText: z.string().min(1),
    kbbText: z.string().min(1),
    justificationText: z.string().min(1),
  }),
});

export type AiListingContent = z.infer<typeof AiListingContentSchema>;

function buildPrompt(
  decoded: VinDecodeResult,
  prospect?: DealerProspect
): string {
  const prospectLine = prospect
    ? `Personalize the seller's note for prospect ${prospect.firstName} ${prospect.lastName}.`
    : 'Write copy for a private seller listing.';

  return [
    'You are an expert automotive listing writer generating a complete vehicle listing from factory VIN decode data.',
    prospectLine,
    'Use ONLY plausible factory options, packages, and MSRP values for this exact year/make/model/trim.',
    'The Monroney sticker must include baseMsrp, destinationCharge, totalMsrp, options (packages/options/fees), and standardEquipment categories.',
    'Suggested price should reflect fair private-party value for the suggested mileage — not MSRP.',
    'Suggested mileage should be realistic for the vehicle year unless prospect context implies otherwise.',
    'Return marketing copy that is confident, factual, and ready to publish.',
    '',
    'VIN decode data (authoritative):',
    JSON.stringify(decoded, null, 2),
  ].join('\n');
}

export async function generateListingContent(
  decoded: VinDecodeResult,
  prospect?: DealerProspect
): Promise<AiListingContent> {
  const prompt = buildPrompt(decoded, prospect);

  const run = () =>
    generateObject({
      model: getGeminiTextModel(),
      schema: AiListingContentSchema,
      prompt,
    });

  try {
    const result = await run();
    return result.object;
  } catch (firstError) {
    console.warn('generateListingContent retry after failure', firstError);
    const result = await run();
    return result.object;
  }
}

export { GEMINI_TEXT_MODEL };
