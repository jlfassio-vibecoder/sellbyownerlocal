import { z } from 'zod';
import {
  MechanicalItemSchema,
  MonroneyOptionSchema,
  MonroneyPartsContentSchema,
  MonroneySchema,
  MonroneyStandardEquipmentSchema,
  MonroneyWarrantySchema,
  VehicleHighlightSchema,
} from '../../schemas';

/** Monroney subset the model generates — federal/vPIC fields are merged server-side. */
export const AiMonroneySchema = MonroneySchema.omit({
  styleLine: true,
  factorySpecs: true,
  fuelEconomy: true,
  epa: true,
  safetyRatings: true,
  manufacturerInfo: true,
  assembly: true,
});

export const AiListingContentSchema = z.object({
  description: z.string().min(1),
  subtitle: z.string().min(1),
  suggestedPrice: z.number().positive(),
  suggestedMileage: z.number().int().nonnegative(),
  exteriorColor: z.string().min(1),
  interiorColor: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  features: z.array(z.string().min(1)).min(1),
  monroney: AiMonroneySchema,
  highlights: z.array(VehicleHighlightSchema).min(1).max(4),
  mechanicalIntro: z.string().min(1),
  mechanicalItems: z.array(MechanicalItemSchema).min(1).max(3),
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

export const AiMonroneyLenientSchema = z
  .object({
    baseMsrp: z.number().positive().optional(),
    destinationCharge: z.number().nonnegative().optional(),
    totalMsrp: z.number().positive().optional(),
    options: z.array(MonroneyOptionSchema).optional(),
    standardEquipment: z.array(MonroneyStandardEquipmentSchema).optional(),
    warranty: MonroneyWarrantySchema.optional(),
    partsContent: MonroneyPartsContentSchema.optional(),
  })
  .strip();

export const AiListingContentLenientSchema = z
  .object({
    description: z.string().optional(),
    subtitle: z.string().optional(),
    suggestedPrice: z.number().positive().optional(),
    suggestedMileage: z.number().int().nonnegative().optional(),
    exteriorColor: z.string().optional(),
    interiorColor: z.string().optional(),
    tags: z.array(z.string().min(1)).optional(),
    features: z.array(z.string().min(1)).optional(),
    monroney: AiMonroneyLenientSchema.optional(),
    highlights: z.array(VehicleHighlightSchema).optional(),
    mechanicalIntro: z.string().optional(),
    mechanicalItems: z.array(MechanicalItemSchema).optional(),
    peaceOfMindText: z.string().optional(),
    maintenanceText: z.string().optional(),
    utilityTowingText: z.string().optional(),
    luxuryOptionsText: z.string().optional(),
    ctaText: z.string().optional(),
    marketValuation: z
      .object({
        contextText: z.string().optional(),
        dealerRealityText: z.string().optional(),
        kbbText: z.string().optional(),
        justificationText: z.string().optional(),
      })
      .optional(),
  })
  .strip();

export type PartialAiListingContent = z.infer<typeof AiListingContentLenientSchema>;
