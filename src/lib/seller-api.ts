import type { Conversation, PopulateMonroneyFromStickerResponse, PopulateMonroneyFromVinResponse, VehicleFormState } from '../schemas';

export class SellerApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SellerApiError';
    this.status = status;
  }
}

async function parseErrorResponse(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (typeof data.error === 'string') return data.error;
  return res.statusText || 'Request failed';
}

export async function updateVehicle(
  vehicleId: string,
  formState: VehicleFormState
): Promise<void> {
  const res = await fetch(`/api/seller/vehicles/${encodeURIComponent(vehicleId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formState),
  });

  if (!res.ok) {
    throw new SellerApiError(await parseErrorResponse(res), res.status);
  }
}

export async function uploadDocument(
  vehicleId: string,
  file: File,
  purpose:
    | 'document'
    | 'gallery'
    | 'comps'
    | 'original_sticker'
    | 'history_report'
    | 'kbb_report'
    | 'smog_certificate' = 'document'
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('vehicleId', vehicleId);
  formData.append('purpose', purpose);

  const res = await fetch('/api/seller/uploads', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new SellerApiError(await parseErrorResponse(res), res.status);
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function updateSmogCertificateUrls(
  vehicleId: string,
  urls: string[]
): Promise<void> {
  const res = await fetch(
    `/api/seller/vehicles/${encodeURIComponent(vehicleId)}/smog-certificate-urls`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    }
  );

  if (!res.ok) {
    throw new SellerApiError(await parseErrorResponse(res), res.status);
  }
}

export async function updateHistoryReportUrls(
  vehicleId: string,
  urls: string[]
): Promise<void> {
  const res = await fetch(
    `/api/seller/vehicles/${encodeURIComponent(vehicleId)}/history-report-urls`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    }
  );

  if (!res.ok) {
    throw new SellerApiError(await parseErrorResponse(res), res.status);
  }
}

export async function deleteKbbReport(vehicleId: string): Promise<void> {
  const res = await fetch(
    `/api/seller/vehicles/${encodeURIComponent(vehicleId)}/kbb-report`,
    { method: 'DELETE' }
  );

  if (!res.ok) {
    throw new SellerApiError(await parseErrorResponse(res), res.status);
  }
}

export async function getConversations(vehicleId: string): Promise<Conversation[]> {
  const params = new URLSearchParams({ vehicleId });
  const res = await fetch(`/api/seller/conversations?${params.toString()}`);

  if (!res.ok) {
    throw new SellerApiError(await parseErrorResponse(res), res.status);
  }

  return (await res.json()) as Conversation[];
}

export async function markMessagesRead(sessionId: string, vehicleId: string): Promise<void> {
  const params = new URLSearchParams({ vehicleId });
  const res = await fetch(
    `/api/seller/messages/${encodeURIComponent(sessionId)}/read?${params.toString()}`,
    { method: 'POST' }
  );

  if (!res.ok) {
    throw new SellerApiError(await parseErrorResponse(res), res.status);
  }
}

export async function populateMonroneyFromVin(
  vehicleId: string,
  vin: string
): Promise<PopulateMonroneyFromVinResponse> {
  const res = await fetch(
    `/api/seller/vehicles/${encodeURIComponent(vehicleId)}/populate-monroney-from-vin`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vin }),
    }
  );

  if (!res.ok) {
    throw new SellerApiError(await parseErrorResponse(res), res.status);
  }

  return (await res.json()) as PopulateMonroneyFromVinResponse;
}

export async function populateMonroneyFromSticker(
  vehicleId: string,
  stickerFile: string,
  vin?: string
): Promise<PopulateMonroneyFromStickerResponse> {
  const res = await fetch(
    `/api/seller/vehicles/${encodeURIComponent(vehicleId)}/populate-monroney-from-sticker`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stickerFile,
        ...(vin ? { vin } : {}),
      }),
    }
  );

  if (!res.ok) {
    throw new SellerApiError(await parseErrorResponse(res), res.status);
  }

  return (await res.json()) as PopulateMonroneyFromStickerResponse;
}

export async function promoteComparableToMarketplace(
  parentVehicleId: string,
  comparableIndex: number
): Promise<{ vehicleId: string; path: string }> {
  const res = await fetch('/api/seller/vehicles/from-comparable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentVehicleId, comparableIndex }),
  });

  if (!res.ok) {
    throw new SellerApiError(await parseErrorResponse(res), res.status);
  }

  return (await res.json()) as { vehicleId: string; path: string };
}
