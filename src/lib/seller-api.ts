import type { VehicleFormState } from '../schemas';

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

export async function uploadDocument(vehicleId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('vehicleId', vehicleId);

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
