import { NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import { AiMonroneyLenientSchema, AiMonroneySchema } from './ai-listing-content-schema';
import { formatZodIssues } from './parse-partial-listing-content';

type AiMonroney = z.infer<typeof AiMonroneySchema>;

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error('No JSON object found in model output');
}

export function hasSalvageableMonroneyContent(content: z.infer<typeof AiMonroneyLenientSchema>): boolean {
  return Boolean(
    content.totalMsrp != null ||
      content.baseMsrp != null ||
      (content.options?.length ?? 0) > 0 ||
      (content.standardEquipment?.length ?? 0) > 0
  );
}

function normalizeMonroneyRaw(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'monroney' in raw) {
    const nested = (raw as { monroney?: unknown }).monroney;
    if (nested && typeof nested === 'object') {
      return nested;
    }
  }
  return raw;
}

export function parseLenientMonroneyContent(raw: unknown): {
  content: z.infer<typeof AiMonroneyLenientSchema>;
  fieldErrors: string[];
} {
  const normalized = normalizeMonroneyRaw(raw);
  const strict = AiMonroneySchema.safeParse(normalized);
  if (strict.success) {
    return { content: strict.data, fieldErrors: [] };
  }

  const lenient = AiMonroneyLenientSchema.safeParse(normalized);
  if (!lenient.success) {
    return { content: {}, fieldErrors: formatZodIssues(lenient.error) };
  }

  return {
    content: lenient.data,
    fieldErrors: formatZodIssues(strict.error),
  };
}

export function isFullAiMonroneyContent(
  content: z.infer<typeof AiMonroneyLenientSchema>
): content is AiMonroney {
  return AiMonroneySchema.safeParse(content).success;
}

export function extractPartialMonroneyFromGenerationError(
  error: unknown
): { content: z.infer<typeof AiMonroneyLenientSchema>; fieldErrors: string[] } | null {
  if (!NoObjectGeneratedError.isInstance(error) || !error.text?.trim()) {
    return null;
  }

  try {
    const raw = extractJsonObject(error.text);
    const parsed = parseLenientMonroneyContent(raw);
    if (!hasSalvageableMonroneyContent(parsed.content)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
