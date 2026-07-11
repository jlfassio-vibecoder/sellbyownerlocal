import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebase-admin';
import {
  UserSchema,
  type User,
  type VerificationTier,
  VerificationTierSchema,
} from '../schemas';
import {
  isValidStorefrontSlug,
  resolveStorefrontSegment,
} from '../utils/url-helpers';
import { meetsVerificationTier, TIER_RANK } from './verification';

export { meetsVerificationTier, TIER_RANK };

export interface ProvisionUserProfileHints {
  displayName?: string;
  email?: string;
}

export class StorefrontSlugConflictError extends Error {
  constructor(message = 'Storefront URL is already taken') {
    super(message);
    this.name = 'StorefrontSlugConflictError';
  }
}

export class StorefrontSlugValidationError extends Error {
  constructor(message = 'Invalid storefront URL') {
    super(message);
    this.name = 'StorefrontSlugValidationError';
  }
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

export interface StorefrontBrandingUpdate {
  storefrontName?: string;
  storefrontTagline?: string;
  storefrontHeroUrl?: string;
}

/** Merge storefront branding fields; empty string clears via FieldValue.delete(). */
export async function updateUserStorefrontBranding(
  uid: string,
  fields: StorefrontBrandingUpdate
): Promise<void> {
  const patch: Record<string, string | FieldValue> = {};

  if (fields.storefrontName !== undefined) {
    patch.storefrontName =
      fields.storefrontName === '' ? FieldValue.delete() : fields.storefrontName;
  }
  if (fields.storefrontTagline !== undefined) {
    patch.storefrontTagline =
      fields.storefrontTagline === '' ? FieldValue.delete() : fields.storefrontTagline;
  }
  if (fields.storefrontHeroUrl !== undefined) {
    patch.storefrontHeroUrl =
      fields.storefrontHeroUrl === '' ? FieldValue.delete() : fields.storefrontHeroUrl;
  }

  if (Object.keys(patch).length === 0) return;

  await db().collection('users').doc(uid).set(patch, { merge: true });
}

export async function getStorefrontSegmentForSeller(sellerId: string): Promise<string> {
  const profile = await getUserProfile(sellerId);
  return resolveStorefrontSegment({
    id: sellerId,
    storefrontSlug: profile?.storefrontSlug,
  });
}

/** Resolve a storefront URL param via slug lookup, then UID fallback. */
export async function resolveSellerByStorefrontParam(
  param: string
): Promise<(User & { id: string }) | null> {
  const trimmed = param.trim();
  if (!trimmed) return null;

  // Copilot suggestion ignored: already lowercases the slug before storefront_slugs lookup.
  const slugDoc = await db().collection('storefront_slugs').doc(trimmed.toLowerCase()).get();
  if (slugDoc.exists) {
    const sellerId = slugDoc.data()?.sellerId;
    if (typeof sellerId === 'string' && sellerId.length > 0) {
      return getUserProfile(sellerId);
    }
  }

  return getUserProfile(trimmed);
}

/** Batch-resolve canonical storefront path segments for many seller IDs. */
export async function resolveStorefrontSegmentsForSellerIds(
  sellerIds: string[]
): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(sellerIds.filter(Boolean))];
  const result: Record<string, string> = {};

  if (uniqueIds.length === 0) return result;

  const refs = uniqueIds.map((id) => db().collection('users').doc(id));
  const snaps = await db().getAll(...refs);

  for (const snap of snaps) {
    if (!snap.exists) {
      result[snap.id] = snap.id;
      continue;
    }
    const data = snap.data();
    const storefrontSlug =
      typeof data?.storefrontSlug === 'string' ? data.storefrontSlug : undefined;
    result[snap.id] = resolveStorefrontSegment({ id: snap.id, storefrontSlug });
  }

  for (const id of uniqueIds) {
    if (!(id in result)) {
      result[id] = id;
    }
  }

  return result;
}

export async function isStorefrontSlugAvailable(
  slug: string,
  callerUid?: string
): Promise<boolean> {
  if (!isValidStorefrontSlug(slug)) return false;

  const doc = await db().collection('storefront_slugs').doc(slug).get();
  if (!doc.exists) return true;

  const ownerId = doc.data()?.sellerId;
  return typeof ownerId === 'string' && callerUid !== undefined && ownerId === callerUid;
}

export async function claimOrUpdateStorefrontSlug(uid: string, slug: string): Promise<void> {
  const normalized = slug.trim().toLowerCase();

  if (!isValidStorefrontSlug(normalized)) {
    throw new StorefrontSlugValidationError(
      'Storefront URL must be 3–48 characters, lowercase letters, numbers, and hyphens only'
    );
  }

  const userRef = db().collection('users').doc(uid);
  const slugRef = db().collection('storefront_slugs').doc(normalized);

  await db().runTransaction(async (tx) => {
    // Firestore requires all transaction reads before writes; await sequentially.
    const slugSnap = await tx.get(slugRef);
    const userSnap = await tx.get(userRef);

    if (slugSnap.exists) {
      const ownerId = slugSnap.data()?.sellerId;
      if (typeof ownerId === 'string' && ownerId !== uid) {
        throw new StorefrontSlugConflictError();
      }
    }

    const currentSlug =
      typeof userSnap.data()?.storefrontSlug === 'string'
        ? (userSnap.data()!.storefrontSlug as string)
        : undefined;

    if (currentSlug === normalized) {
      return;
    }

    const now = new Date();
    const previous: string[] = Array.isArray(userSnap.data()?.previousStorefrontSlugs)
      ? [...(userSnap.data()!.previousStorefrontSlugs as string[])]
      : [];

    if (currentSlug && currentSlug !== normalized && !previous.includes(currentSlug)) {
      previous.push(currentSlug);
    }

    tx.set(
      userRef,
      {
        storefrontSlug: normalized,
        storefrontSlugUpdatedAt: now.toISOString(),
        previousStorefrontSlugs: previous,
      },
      { merge: true }
    );

    const existingCreatedAt = slugSnap.exists ? slugSnap.data()?.createdAt : undefined;
    tx.set(slugRef, {
      sellerId: uid,
      createdAt: existingCreatedAt ?? now,
      updatedAt: now,
    });
  });
}

export async function upgradeToPhoneVerified(
  uid: string,
  phoneE164: string
): Promise<VerificationTier> {
  const ref = db().collection('users').doc(uid);
  const existing = await ref.get();
  let currentTier: VerificationTier = 'anonymous';
  if (existing.exists) {
    const tierParsed = VerificationTierSchema.safeParse(existing.data()?.verificationTier);
    currentTier = tierParsed.success ? tierParsed.data : 'anonymous';
  }

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
