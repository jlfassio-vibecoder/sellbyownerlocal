import { NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import {
  AiListingContentLenientSchema,
  AiListingContentSchema,
  type AiListingContent,
  type PartialAiListingContent,
} from './ai-listing-content-schema';

export type { AiListingContent, PartialAiListingContent };

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });
}

export function hasSalvageableListingContent(content: PartialAiListingContent): boolean {
  return Boolean(
    content.description?.trim() ||
      content.subtitle?.trim() ||
      content.monroney?.totalMsrp != null ||
      content.monroney?.baseMsrp != null ||
      (content.highlights?.length ?? 0) > 0 ||
      content.peaceOfMindText?.trim() ||
      content.mechanicalIntro?.trim() ||
      (content.mechanicalItems?.length ?? 0) > 0 ||
      content.marketValuation?.contextText?.trim()
  );
}

export function parseLenientListingContent(raw: unknown): {
  content: PartialAiListingContent;
  fieldErrors: string[];
} {
  const strict = AiListingContentSchema.safeParse(raw);
  if (strict.success) {
    return { content: strict.data, fieldErrors: [] };
  }

  const lenient = AiListingContentLenientSchema.safeParse(raw);
  if (!lenient.success) {
    return { content: {}, fieldErrors: formatZodIssues(lenient.error) };
  }

  return {
    content: lenient.data,
    fieldErrors: formatZodIssues(strict.error),
  };
}

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

export function extractPartialFromGenerationError(
  error: unknown
): { content: PartialAiListingContent; fieldErrors: string[] } | null {
  if (!NoObjectGeneratedError.isInstance(error) || !error.text?.trim()) {
    return null;
  }

  try {
    const raw = extractJsonObject(error.text);
    const parsed = parseLenientListingContent(raw);
    if (!hasSalvageableListingContent(parsed.content)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isFullAiListingContent(
  content: PartialAiListingContent
): content is AiListingContent {
  return AiListingContentSchema.safeParse(content).success;
}
