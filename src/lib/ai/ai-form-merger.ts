import type { VehicleFormState } from '../../schemas';
import { GenerateListingFormFieldsSchema } from '../../schemas';
import type { z } from 'zod';

type GenerateListingFormFields = z.infer<typeof GenerateListingFormFieldsSchema>;

/** Merge AI-generated listing form fields into existing seller form state (client-safe). */
export function mergeAiFormFields(
  current: VehicleFormState,
  generated: GenerateListingFormFields
): VehicleFormState {
  const mergedMarketValuation =
    generated.marketValuation != null
      ? {
          ...(current.marketValuation ?? { comparables: [] }),
          ...generated.marketValuation,
          comparables:
            generated.marketValuation.comparables ??
            current.marketValuation?.comparables ??
            [],
        }
      : current.marketValuation;

  return {
    ...current,
    ...Object.fromEntries(
      Object.entries(generated).filter(([, value]) => value !== undefined && value !== '')
    ),
    ...(mergedMarketValuation ? { marketValuation: mergedMarketValuation } : {}),
    images: generated.images ?? current.images ?? [],
  };
}
