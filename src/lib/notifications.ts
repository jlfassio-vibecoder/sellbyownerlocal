export type LeadNotificationPayload = {
  sellerId: string;
  leadId: string;
  buyerInfo: { name: string; email: string; phone: string };
  items: Array<{ id: string; title: string; price: number; category: string }>;
  message: string;
};

/**
 * Stub for future email/push providers (e.g. Resend).
 * Logs a structured payload so lead creation has a stable hook.
 */
export async function sendLeadNotification(payload: LeadNotificationPayload): Promise<void> {
  console.info('[lead-notification]', JSON.stringify(payload));
}
