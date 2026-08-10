import type { FavoriteItem } from '../schemas';

const SIGNATURE_PREFIX = '\n\nKind regards,\n';

const DEFAULT_NOTES =
  '[Add your questions about volume pricing, shipping, or specific sizes here...]';

export function buildContactHelperText(items: FavoriteItem[]): string {
  if (items.length === 0) {
    return 'Pro tip: Include any questions about availability or next steps.';
  }

  const hasClothing = items.some((item) => item.category === 'clothing');
  const hasVehicle = items.some((item) => item.category === 'vehicle');

  if (hasClothing && hasVehicle) {
    return 'Pro tip: Ask about volume discounts, shipping requirements, or scheduling a test drive.';
  }

  if (hasClothing) {
    return 'Pro tip: Ask about volume discounts or specific shipping requirements.';
  }

  return 'Pro tip: Ask about scheduling a test drive or vehicle history.';
}

export function buildContactSubheadline(items: FavoriteItem[]): string {
  if (items.some((item) => item.category === 'clothing')) {
    return 'Express your interest and inquire about volume pricing or shipping.';
  }

  return 'Request a quote or ask about your saved items.';
}

export function buildContactMessage(items: FavoriteItem[], name = ''): string {
  const signatureName = name.trim() || 'Name';

  if (items.length === 0) {
    return `Hi there,\n\nI'm interested in learning more about your listings.\n\n[Add any questions about availability, pricing, or next steps here...]${SIGNATURE_PREFIX}${signatureName}`;
  }

  const itemLines = items.map((item) => `- ${item.title}`).join('\n');

  return `Hi there,\n\nI'm interested in these items:\n\n${itemLines}\n\n${DEFAULT_NOTES}${SIGNATURE_PREFIX}${signatureName}`;
}

/**
 * Pull free-text buyer notes from a draft, excluding the greeting, item bullets,
 * and signature so we can rebuild a seller-scoped item list.
 */
export function extractBuyerNotes(draftMessage: string): string {
  let body = draftMessage;
  const signatureIndex = body.lastIndexOf(SIGNATURE_PREFIX);
  if (signatureIndex !== -1) {
    body = body.slice(0, signatureIndex);
  }

  const lines = body.split('\n');
  let lastBulletIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('- ')) {
      lastBulletIndex = i;
    }
  }

  if (lastBulletIndex >= 0) {
    return lines.slice(lastBulletIndex + 1).join('\n').trim() || DEFAULT_NOTES;
  }

  const emptyIntro = "I'm interested in learning more about your listings.";
  const emptyIdx = body.indexOf(emptyIntro);
  if (emptyIdx !== -1) {
    return body.slice(emptyIdx + emptyIntro.length).trim() || DEFAULT_NOTES;
  }

  const trimmed = body.trim();
  if (trimmed.startsWith('Hi there,')) {
    return trimmed.slice('Hi there,'.length).trim() || DEFAULT_NOTES;
  }

  return trimmed || DEFAULT_NOTES;
}

/**
 * Rebuild a lead message that lists ONLY `sellerItems`, preserving the buyer's
 * free-text notes from `draftMessage`. Prevents cross-seller title leakage.
 */
export function buildSellerScopedLeadMessage(
  draftMessage: string,
  sellerItems: FavoriteItem[],
  name: string
): string {
  const signatureName = name.trim() || 'Name';
  const notes = extractBuyerNotes(draftMessage);

  if (sellerItems.length === 0) {
    return `Hi there,\n\nI'm interested in learning more about your listings.\n\n${notes}${SIGNATURE_PREFIX}${signatureName}`;
  }

  const itemLines = sellerItems.map((item) => `- ${item.title}`).join('\n');

  return `Hi there,\n\nI'm interested in these items:\n\n${itemLines}\n\n${notes}${SIGNATURE_PREFIX}${signatureName}`;
}

export function syncContactMessageName(message: string, name: string): string {
  const signatureIndex = message.lastIndexOf(SIGNATURE_PREFIX);

  if (signatureIndex === -1) {
    return `${message}${SIGNATURE_PREFIX}${name.trim() || 'Name'}`;
  }

  return `${message.slice(0, signatureIndex + SIGNATURE_PREFIX.length)}${name.trim() || 'Name'}`;
}
