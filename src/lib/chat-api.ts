import type { Message, MessageCreate } from '../schemas';

export class ChatApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
  }
}

async function parseErrorResponse(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (typeof data.error === 'string') return data.error;
  return res.statusText || 'Request failed';
}

export async function sendMessage(payload: MessageCreate): Promise<Message> {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new ChatApiError(await parseErrorResponse(res), res.status);
  }

  return (await res.json()) as Message;
}

export async function getSessionMessages(
  sessionId: string,
  vehicleId: string
): Promise<Message[]> {
  const params = new URLSearchParams({ vehicleId });
  const res = await fetch(
    `/api/messages/${encodeURIComponent(sessionId)}?${params.toString()}`
  );

  if (!res.ok) {
    throw new ChatApiError(await parseErrorResponse(res), res.status);
  }

  return (await res.json()) as Message[];
}
