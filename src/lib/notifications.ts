export type LeadNotificationPayload = {
  sellerId: string;
  leadId: string;
  buyerInfo: { name: string; email: string; phone: string };
  items: Array<{ id: string; title: string; price: number; category: string }>;
  message: string;
};

/**
 * Stub for future email/push providers (e.g. Resend).
 * Logs non-sensitive metadata only — buyer PII and message body are never written to logs.
 */
export async function sendLeadNotification(payload: LeadNotificationPayload): Promise<void> {
  console.info(
    '[lead-notification]',
    JSON.stringify({
      sellerId: payload.sellerId,
      leadId: payload.leadId,
      itemCount: payload.items.length,
    })
  );
}
