import { generateObject } from 'ai';
import type { VehicleResponse } from '../../schemas';
import { logAiGenerationError } from './ai-errors';
import { AiMarketResearchSchema } from './ai-market-research-schema';
import {
  GEMINI_PRO_MODEL,
  getGeminiProModel,
  MARKET_RESEARCH_TIMEOUT_MS,
} from './gemini';

function buildSystemPrompt(currentYear: number): string {
  return [
    'You are an expert automotive pricing actuary specializing in private-party and retail-ready valuations.',
    'Analyze the vehicle data provided and determine a defensible top-of-market retail-ready asking price.',
    'Write clear, seller-facing market context for each required text field.',
    'Estimate realistic reconditioning deductions (tires, paint, mechanical, interior, other) that a buyer or dealer would apply.',
    'Base your analysis on year, make, model, trim, mileage, options, condition signals, and regional market dynamics.',
    'Output must strictly match the required JSON schema.',
    `Mileage math: The current year is ${currentYear}. Calculate the vehicle's age. The industry average is 13,500 miles per year. You MUST mathematically determine if the provided mileage is below, at, or above average. Do not call it high mileage if it is mathematically below average.`,
    'Dealer retail comparison: For the dealerRealityText, do NOT write a trade-in appraisal. Instead, write a "Dealer Retail vs. Private Party" comparison. Explain how a dealership would price and market this exact vehicle if it were sitting on their lot. A dealership would typically mark up the price significantly (often $3,000-$5,000 higher) to cover overhead, commissions, and profit. They would spin any recent work (like a repaint, new tires, or suspension upgrades) as premium dealer reconditioning to justify their inflated retail price. Use this text to prove to the buyer that buying this vehicle private-party is a massive financial advantage compared to buying it at a dealership.',
    'Private party justification: When writing the justificationText for the private party sale, you MUST reframe reliability modifications (like an air-to-coil suspension conversion on a RAM) as a massive benefit that saves the buyer future repair costs.',
    'Deductions accuracy: Do not automatically deduct for typical reconditioning if the user notes indicate recent major replacements (like new tires). Check description, sellersNote, features, tags, and any seller or mechanical copy in the payload for such notes.',
  ].join(' ');
}

function buildVehiclePayload(vehicle: VehicleResponse): Record<string, unknown> {
  const monroney = vehicle.monroney
    ? {
        totalMsrp: vehicle.monroney.totalMsrp,
        options: vehicle.monroney.options?.map((o) => ({
          label: o.label,
          price: o.price,
        })),
      }
    : undefined;

  return {
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    mileage: vehicle.mileage,
    price: vehicle.price,
    vin: vehicle.vin,
    description: vehicle.description,
    specs: vehicle.specs,
    features: vehicle.features,
    tags: vehicle.tags,
    location: vehicle.location,
    monroney,
    sellersNote: vehicle.sellersNote?.subtitle
      ? { subtitle: vehicle.sellersNote.subtitle }
      : undefined,
    marketValuation: vehicle.marketValuation
      ? {
          contextText: vehicle.marketValuation.contextText,
          dealerRealityText: vehicle.marketValuation.dealerRealityText,
          kbbText: vehicle.marketValuation.kbbText,
          justificationText: vehicle.marketValuation.justificationText,
          retailReadyPrice: vehicle.marketValuation.retailReadyPrice,
          vehicleDeductions: vehicle.marketValuation.vehicleDeductions,
        }
      : undefined,
  };
}

function buildUserPrompt(vehicle: VehicleResponse): string {
  return [
    'Perform deep market research for this vehicle listing.',
    'Return retail-ready price, deduction estimates, and all required market valuation text fields.',
    'Use vehicle.year and mileage from the data below with the mileage math rules from your instructions.',
    '',
    'Vehicle data (JSON):',
    JSON.stringify(buildVehiclePayload(vehicle), null, 2),
  ].join('\n');
}

export async function generateMarketResearch(vehicle: VehicleResponse) {
  const currentYear = new Date().getFullYear();

  const run = () =>
    generateObject({
      model: getGeminiProModel(),
      schema: AiMarketResearchSchema,
      instructions: buildSystemPrompt(currentYear),
      messages: [{ role: 'user', content: buildUserPrompt(vehicle) }],
      abortSignal: AbortSignal.timeout(MARKET_RESEARCH_TIMEOUT_MS),
    });

  try {
    const result = await run();
    return result.object;
  } catch (firstError) {
    logAiGenerationError('generateMarketResearch retry after failure', firstError);
    try {
      const result = await run();
      return result.object;
    } catch (retryError) {
      throw retryError;
    }
  }
}

export { GEMINI_PRO_MODEL };
