import type { VerificationTier } from '../schemas';

export const TIER_RANK: Record<VerificationTier, number> = {
  anonymous: 0,
  phone_verified: 1,
  identity_verified: 2,
};

export function meetsVerificationTier(
  current: VerificationTier,
  required: VerificationTier
): boolean {
  return TIER_RANK[current] >= TIER_RANK[required];
}
