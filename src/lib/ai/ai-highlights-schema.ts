import { z } from 'zod';
import { VehicleHighlightSchema } from '../../schemas';

export const AiHighlightsSchema = z.object({
  highlights: z.array(VehicleHighlightSchema).length(4),
});

export type AiHighlights = z.infer<typeof AiHighlightsSchema>;
