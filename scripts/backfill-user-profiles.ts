#!/usr/bin/env npx tsx
/**
 * Backfill users/{uid} profiles with verificationTier defaults and ensure seller UIDs exist.
 *
 * Usage: npx tsx scripts/backfill-user-profiles.ts
 *
 * Credentials (same as the app — see .env.example):
 *   - GOOGLE_APPLICATION_CREDENTIALS
 *   - FIREBASE_SERVICE_ACCOUNT_JSON
 *   - FIRESTORE_DATABASE_ID (optional)
 */
import 'dotenv/config';
import { db } from '../src/lib/firebase-admin.js';
import { provisionUserProfile } from '../src/lib/buyer-profile.js';
import { UserSchema } from '../src/schemas/index.js';

async function main() {
  const sellerIds = new Set<string>();
  const vehiclesSnap = await db().collection('vehicles').get();

  for (const doc of vehiclesSnap.docs) {
    const sellerId = doc.data().sellerId;
    if (typeof sellerId === 'string' && sellerId.trim()) {
      sellerIds.add(sellerId.trim());
    }
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const uid of sellerIds) {
    const ref = db().collection('users').doc(uid);
    const before = await ref.get();
    const hadDoc = before.exists;

    await provisionUserProfile(uid, {});

    const after = await ref.get();
    if (!hadDoc && after.exists) {
      created++;
      console.log(`  created  users/${uid}`);
    } else if (hadDoc) {
      const parsed = UserSchema.safeParse(after.data());
      const beforeTier = before.data()?.verificationTier;
      const afterTier = parsed.success ? parsed.data.verificationTier : undefined;
      if (beforeTier !== afterTier || !before.data()?.stats) {
        updated++;
        console.log(`  updated  users/${uid}`);
      } else {
        skipped++;
      }
    }
  }

  const usersSnap = await db().collection('users').get();
  for (const doc of usersSnap.docs) {
    if (sellerIds.has(doc.id)) continue;

    const before = doc.data();
    await provisionUserProfile(doc.id, {});

    const after = await doc.ref.get();
    const afterData = after.data();
    if (
      !before.verificationTier && afterData?.verificationTier ||
      !before.stats && afterData?.stats
    ) {
      updated++;
      console.log(`  updated  users/${doc.id}`);
    } else {
      skipped++;
    }
  }

  console.log('\nBackfill complete.');
  console.log(`  Seller UIDs scanned: ${sellerIds.size}`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
}

main().catch((error) => {
  console.error('backfill-user-profiles failed:', error);
  process.exit(1);
});
