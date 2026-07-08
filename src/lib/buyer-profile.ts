import { db } from './firebase-admin';
import {
  UserSchema,
  type User,
  type VerificationTier,
  VerificationTierSchema,
} from '../schemas';

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

export interface ProvisionUserProfileHints {
  displayName?: string;
  email?: string;
}

function displayNameFromEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const local = email.split('@')[0]?.trim();
  return local && local.length > 0 ? local : undefined;
}

function defaultUserProfile(hints: ProvisionUserProfileHints): User {
  const displayName =
    hints.displayName?.trim() ||
    displayNameFromEmail(hints.email) ||
    'User';

  return UserSchema.parse({
    displayName,
    stats: { averageRating: 0, itemsSold: 0 },
    verificationTier: 'anonymous',
  });
}

export async function getUserProfile(uid: string): Promise<(User & { id: string }) | null> {
  const doc = await db().collection('users').doc(uid).get();
  if (!doc.exists) return null;

  const parsed = UserSchema.safeParse(doc.data());
  if (!parsed.success) return null;

  return { id: doc.id, ...parsed.data };
}

export async function resolveVerificationTier(uid: string): Promise<VerificationTier> {
  const profile = await getUserProfile(uid);
  if (!profile) return 'anonymous';
  return profile.verificationTier;
}

export async function provisionUserProfile(
  uid: string,
  hints: ProvisionUserProfileHints = {}
): Promise<VerificationTier> {
  const ref = db().collection('users').doc(uid);
  const existing = await ref.get();

  if (!existing.exists) {
    const profile = defaultUserProfile(hints);
    await ref.set(profile);
    return profile.verificationTier;
  }

  const parsed = UserSchema.safeParse(existing.data());
  if (!parsed.success) {
    const profile = defaultUserProfile(hints);
    await ref.set(profile, { merge: true });
    return profile.verificationTier;
  }

  const current = parsed.data;
  const patch: Partial<User> = {};

  if (!current.displayName?.trim() && (hints.displayName || hints.email)) {
    patch.displayName =
      hints.displayName?.trim() ||
      displayNameFromEmail(hints.email) ||
      'User';
  }

  if (!current.stats) {
    patch.stats = { averageRating: 0, itemsSold: 0 };
  }

  if (!current.verificationTier) {
    patch.verificationTier = 'anonymous';
  }

  if (Object.keys(patch).length > 0) {
    await ref.set(patch, { merge: true });
  }

  const tierParsed = VerificationTierSchema.safeParse(
    patch.verificationTier ?? current.verificationTier ?? 'anonymous'
  );
  return tierParsed.success ? tierParsed.data : 'anonymous';
}

export async function updateUserDisplayName(uid: string, displayName: string): Promise<void> {
  const trimmed = displayName.trim();
  await db().collection('users').doc(uid).set({ displayName: trimmed }, { merge: true });
}

export async function upgradeToPhoneVerified(
  uid: string,
  phoneE164: string
): Promise<VerificationTier> {
  const ref = db().collection('users').doc(uid);
  const existing = await ref.get();
  const currentTier = existing.exists
    ? VerificationTierSchema.safeParse(existing.data()?.verificationTier).data ?? 'anonymous'
    : 'anonymous';

  if (currentTier === 'identity_verified') {
    await ref.set(
      {
        phone: phoneE164,
        phoneVerifiedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return 'identity_verified';
  }

  const tier: VerificationTier = 'phone_verified';
  await ref.set(
    {
      phone: phoneE164,
      phoneVerifiedAt: new Date().toISOString(),
      verificationTier: tier,
    },
    { merge: true }
  );
  return tier;
}
