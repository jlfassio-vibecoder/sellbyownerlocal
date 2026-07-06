import { z } from 'zod';
import { VehicleDeductionsSchema } from '../../schemas';

const deductionAmountFields = ['tires', 'paint', 'mechanical', 'interior', 'other'] as const;

export const AiVehicleDeductionsSchema = VehicleDeductionsSchema.refine(
  (d) => deductionAmountFields.some((key) => d[key] != null && d[key]! > 0),
  { message: 'At least one deduction amount is required' }
);

export const AiMarketResearchSchema = z.object({
  contextText: z.string().min(1),
  dealerRealityText: z.string().min(1),
  kbbText: z.string().min(1),
  justificationText: z.string().min(1),
  retailReadyPrice: z.number().positive(),
  vehicleDeductions: AiVehicleDeductionsSchema,
});

export type AiMarketResearch = z.infer<typeof AiMarketResearchSchema>;
