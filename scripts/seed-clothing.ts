#!/usr/bin/env npx tsx
/**
 * Seed a mock clothing listing into clothing_listings.
 *
 * Usage: npx tsx scripts/seed-clothing.ts
 *
 * Credentials (same as the app — see .env.example):
 *   - GOOGLE_APPLICATION_CREDENTIALS
 *   - FIREBASE_SERVICE_ACCOUNT_JSON
 *   - FIRESTORE_DATABASE_ID (optional)
 */
import 'dotenv/config';
import { db } from '../src/lib/firebase-admin.js';

const LISTING_ID = 'mountain-premium-fleece';
const SELLER_ID = '4SDUnGT1TvhhAweUYFCL8MIsstG3';

const listing = {
  title: 'Mountain Premium Fleece',
  brand: 'Mountain Rep Co.',
  price: 13.5,
  description: 'Heavyweight wholesale fleece for independent reps.',
  sizes: ['S', 'M', 'L', 'XL', '2XL'],
  colors: ['Heather Grey', 'Olive', 'Navy', 'Black'],
  material: '80% cotton / 20% polyester fleece',
  prePackRatio: 'M-L-XL-2XL (2-4-4-2)',
  galleryPhotos: [
    'https://picsum.photos/seed/fleece1/800/1000',
    'https://picsum.photos/seed/fleece2/800/1000',
    'https://picsum.photos/seed/fleece3/800/1000',
  ],
  pdfLineSheetUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  sellerId: SELLER_ID,
  status: 'active' as const,
  createdAt: new Date().toISOString(),
};

async function main() {
  await db().collection('clothing_listings').doc(LISTING_ID).set(listing);

  console.log(`Seeded clothing_listings/${LISTING_ID}`);
  console.log(`View at: /marketplace/clothing/${LISTING_ID}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
