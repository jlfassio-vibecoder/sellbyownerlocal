import { generateObject } from 'ai';
import type { VehicleResponse } from '../../schemas';
import { logAiGenerationError } from './ai-errors';
import { AiHighlightsSchema } from './ai-highlights-schema';
import {
  GEMINI_TEXT_MODEL,
  getGeminiTextModel,
  TEXT_GENERATION_TIMEOUT_MS,
} from './gemini';

function buildSystemPrompt(): string {
  return [
    'You are an elite automotive copywriter.',
    "Analyze the provided vehicle's original window sticker options and the recent market valuation research.",
    'Generate exactly 4 standout highlights that define the utility, value, and appeal of this specific vehicle.',
    'Focus on the most expensive optional equipment, key performance metrics, or unique reconditioning advantages (like a reliability-focused suspension conversion).',
    'Tone: Professional, authoritative, and benefits-driven. NO cheesy car salesman jargon.',
    'Output must strictly match the required JSON schema.',
  ].join(' ');
}

function buildVehiclePayload(vehicle: VehicleResponse): Record<string, unknown> {
  const monroney = vehicle.monroney
    ? {
        styleLine: vehicle.monroney.styleLine,
        totalMsrp: vehicle.monroney.totalMsrp,
        options: vehicle.monroney.options.map((o) => ({
          label: o.label,
          price: o.price,
          category: o.category,
        })),
      }
    : undefined;

  return {
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.monroney?.styleLine ?? vehicle.model,
    description: vehicle.description,
    specs: vehicle.specs,
    features: vehicle.features,
    tags: vehicle.tags,
    monroney,
    marketValuation: vehicle.marketValuation,
  };
}

function buildUserPrompt(vehicle: VehicleResponse): string {
  return [
    'Generate exactly 4 vehicle marketing highlights based on the data below.',
    'Prioritize window sticker options and market valuation insights when present.',
    '',
    'Vehicle data (JSON):',
    JSON.stringify(buildVehiclePayload(vehicle), null, 2),
  ].join('\n');
}

export async function generateHighlights(vehicle: VehicleResponse) {
  const run = () =>
    generateObject({
      model: getGeminiTextModel(),
      schema: AiHighlightsSchema,
      instructions: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(vehicle) }],
      abortSignal: AbortSignal.timeout(TEXT_GENERATION_TIMEOUT_MS),
    });

  try {
    const result = await run();
    return result.object;
  } catch (firstError) {
    logAiGenerationError('generateHighlights retry after failure', firstError);
    try {
      const result = await run();
      return result.object;
    } catch (retryError) {
      throw retryError;
    }
  }
}

export { GEMINI_TEXT_MODEL };
