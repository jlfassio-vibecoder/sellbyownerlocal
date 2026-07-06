import type { GenerateListingResponse, GenerateMarketResearchResponse } from '../schemas';

export class AiApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AiApiError';
    this.status = status;
  }
}

async function parseErrorResponse(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (typeof data.error === 'string') return data.error;
  return res.statusText || 'Request failed';
}

export async function generateListingFromVin(body: {
  vin: string;
  vehicleId?: string;
  prospect?: { firstName: string; lastName: string };
  stickerFile?: string;
}): Promise<GenerateListingResponse> {
  const res = await fetch('/api/ai/generate-listing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new AiApiError(await parseErrorResponse(res), res.status);
  }

  return (await res.json()) as GenerateListingResponse;
}

export async function generateHeroImage(vehicleId: string): Promise<{ url: string }> {
  const res = await fetch('/api/ai/generate-hero-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleId }),
  });

  if (!res.ok) {
    throw new AiApiError(await parseErrorResponse(res), res.status);
  }

  return (await res.json()) as { url: string };
}

export async function generateMarketResearch(
  vehicleId: string
): Promise<GenerateMarketResearchResponse> {
  const res = await fetch('/api/ai/generate-market-research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleId }),
  });

  if (!res.ok) {
    throw new AiApiError(await parseErrorResponse(res), res.status);
  }

  return (await res.json()) as GenerateMarketResearchResponse;
}
