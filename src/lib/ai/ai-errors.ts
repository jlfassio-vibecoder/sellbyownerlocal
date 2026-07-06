export class MissingGoogleAiApiKeyError extends Error {
  constructor() {
    super('Missing GOOGLE_GENERATIVE_AI_API_KEY');
    this.name = 'MissingGoogleAiApiKeyError';
  }
}

export function isMissingApiKeyError(error: unknown): boolean {
  return (
    error instanceof MissingGoogleAiApiKeyError ||
    (error instanceof Error && error.message.includes('Missing GOOGLE_GENERATIVE_AI_API_KEY'))
  );
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function isNoObjectGeneratedError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AI_NoObjectGeneratedError';
}

export function isInvalidPromptError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AI_InvalidPromptError';
}

export function mapAiGenerationError(error: unknown): { status: number; message: string } {
  if (isMissingApiKeyError(error)) {
    return { status: 503, message: 'AI service is not configured' };
  }
  if (isAbortError(error)) {
    return { status: 502, message: 'AI generation timed out. Please retry.' };
  }
  if (isNoObjectGeneratedError(error)) {
    return { status: 502, message: 'AI output validation failed. Please retry.' };
  }
  if (isInvalidPromptError(error)) {
    return { status: 500, message: 'AI prompt configuration error. Please contact support.' };
  }
  return { status: 502, message: 'AI generation failed. Please retry.' };
}

export function logAiGenerationError(context: string, error: unknown): void {
  if (isAbortError(error)) {
    console.error(`${context}: request timed out`, error);
    return;
  }
  if (isNoObjectGeneratedError(error)) {
    console.error(`${context}: structured output validation failed`, error);
    return;
  }
  console.error(context, error);
}
