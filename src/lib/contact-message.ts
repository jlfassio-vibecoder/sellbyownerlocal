import type { FavoriteItem } from '../schemas';

const SIGNATURE_PREFIX = '\n\nKind regards,\n';

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

  return `Hi there,\n\nI'm interested in these items:\n\n${itemLines}\n\n[Add your questions about volume pricing, shipping, or specific sizes here...]${SIGNATURE_PREFIX}${signatureName}`;
}

export function syncContactMessageName(message: string, name: string): string {
  const signatureIndex = message.lastIndexOf(SIGNATURE_PREFIX);

  if (signatureIndex === -1) {
    return `${message}${SIGNATURE_PREFIX}${name.trim() || 'Name'}`;
  }

  return `${message.slice(0, signatureIndex + SIGNATURE_PREFIX.length)}${name.trim() || 'Name'}`;
}
