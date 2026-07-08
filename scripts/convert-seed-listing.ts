#!/usr/bin/env npx tsx
/**
 * Duplicate vehicles/seed-ram-1500 into a production-style listing with a Firestore auto-ID.
 *
 * The app routes public listings at /vehicles/[id] using the Firestore document ID directly
 * (no slug field). New listings created via generate-listing use collection('vehicles').add().
 *
 * Usage:
 *   npx tsx scripts/convert-seed-listing.ts
 *   npx tsx scripts/convert-seed-listing.ts --seller-id=<firebase-uid>
 *
 * Credentials (same as the app — see .env.example):
 *   - GOOGLE_APPLICATION_CREDENTIALS  path to service account JSON
 *   - FIREBASE_SERVICE_ACCOUNT_JSON   inline JSON string
 *   - FIREBASE_PROJECT_ID             optional but recommended
 *   - FIRESTORE_DATABASE_ID           optional, when using a named Firestore database
 *
 * Optional env:
 *   - SELLER_ID                       override sellerId on the new listing
 *   - PUBLIC_SITE_URL                 base URL for the printed link (default: http://localhost:4321)
 */
import 'dotenv/config';
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { VehicleSchema } from '../src/schemas/index.js';
import { getVehicleListingPath } from '../src/utils/url-helpers.js';

const SEED_DOC_ID = 'seed-ram-1500';

function parseSellerIdArg(): string | undefined {
  const fromEnv = process.env.SELLER_ID?.trim();
  if (fromEnv) return fromEnv;

  const flag = process.argv.find((arg) => arg.startsWith('--seller-id='));
  return flag?.slice('--seller-id='.length).trim() || undefined;
}

function initAdmin() {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return initializeApp({
      credential: cert(sa),
      projectId: projectId ?? sa.project_id,
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  throw new Error(
    'Missing Firebase Admin credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON in .env (see .env.example).'
  );
}

function resolveBaseUrl(): string {
  const base = process.env.PUBLIC_SITE_URL?.trim() || 'http://localhost:4321';
  return base.replace(/\/$/, '');
}

async function main() {
  const sellerIdOverride = parseSellerIdArg();
  const app = initAdmin();
  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

  const seedRef = db.collection('vehicles').doc(SEED_DOC_ID);
  const seedSnap = await seedRef.get();

  if (!seedSnap.exists) {
    console.error(`Seed document vehicles/${SEED_DOC_ID} not found.`);
    console.error('Seed it first: curl http://localhost:4321/api/dev/seed (dev only)');
    process.exit(1);
  }

  const seedData = seedSnap.data() as Record<string, unknown>;
  const listingPayload = {
    ...seedData,
    status: 'active' as const,
    ...(sellerIdOverride ? { sellerId: sellerIdOverride } : {}),
  };

  const parsed = VehicleSchema.safeParse(listingPayload);
  if (!parsed.success) {
    console.error('Seed data failed VehicleSchema validation:');
    console.error(parsed.error.flatten());
    process.exit(1);
  }

  const newRef = db.collection('vehicles').doc();
  await newRef.set(parsed.data);

  const vehicle = { ...parsed.data, id: newRef.id };
  const listingUrl = `${resolveBaseUrl()}${getVehicleListingPath(vehicle)}`;

  console.log('Seed listing converted successfully.');
  console.log(`  Source (unchanged): vehicles/${SEED_DOC_ID}`);
  console.log(`  New document:       vehicles/${newRef.id}`);
  console.log(`  Status:             ${parsed.data.status}`);
  console.log(`  Seller ID:          ${parsed.data.sellerId}`);
  console.log(`  Listing URL:        ${listingUrl}`);
}

main().catch((error) => {
  console.error('convert-seed-listing failed:', error);
  process.exit(1);
});
