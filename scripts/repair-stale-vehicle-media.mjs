/**
 * Repair vehicle media URL arrays on a legacy Firestore database by copying
 * authoritative media fields from sellbyowner-prod when Storage objects are missing.
 *
 * Usage:
 *   node --env-file=.env scripts/repair-stale-vehicle-media.mjs
 *   FIRESTORE_REPAIR_DRY_RUN=1 node --env-file=.env scripts/repair-stale-vehicle-media.mjs
 *
 * Env:
 *   FIRESTORE_REPAIR_SOURCE  default: sellbyowner-prod
 *   FIRESTORE_REPAIR_DEST    default: ai-studio-ram1500-a6aad1c3-783c-48e0-a179-f80c48018571
 */
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function loadEnvFile() {
  try {
    const raw = readFileSync('.env', 'utf8');
    for (const line of raw.split('\n')) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const i = line.indexOf('=');
      const key = line.slice(0, i);
      let value = line.slice(i + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // rely on process.env
  }
}

loadEnvFile();

const SOURCE_DB = process.env.FIRESTORE_REPAIR_SOURCE || 'sellbyowner-prod';
const DEST_DB =
  process.env.FIRESTORE_REPAIR_DEST ||
  'ai-studio-ram1500-a6aad1c3-783c-48e0-a179-f80c48018571';
const DRY_RUN = process.env.FIRESTORE_REPAIR_DRY_RUN === '1';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

const MEDIA_FIELDS = [
  'images',
  'heroImageUrls',
  'carouselImageUrls',
  'marketImageUrls',
  'galleryPhotos',
  'modificationImageUrls',
];

function init() {
  if (getApps().length > 0) return;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  initializeApp({
    credential: cert(sa),
    projectId: process.env.FIREBASE_PROJECT_ID || sa.project_id,
    storageBucket: BUCKET,
  });
}

function storageObjectPath(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'storage.googleapis.com') {
      return decodeURIComponent(parsed.pathname.split('/').filter(Boolean).slice(1).join('/'));
    }
    if (parsed.hostname === 'firebasestorage.googleapis.com') {
      const encoded = parsed.pathname.match(/\/o\/(.+)$/)?.[1];
      return encoded ? decodeURIComponent(encoded) : null;
    }
  } catch {
    return null;
  }
  return null;
}

function collectHttpUrls(value, out = []) {
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectHttpUrls(entry, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) collectHttpUrls(nested, out);
  }
  return out;
}

async function countMissingStorageUrls(urls, bucket) {
  let missing = 0;
  for (const url of urls) {
    const path = storageObjectPath(url);
    if (!path) continue;
    const [exists] = await bucket.file(path).exists();
    if (!exists) missing += 1;
  }
  return missing;
}

async function main() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required');
  }
  if (!BUCKET) {
    throw new Error('FIREBASE_STORAGE_BUCKET is required');
  }

  init();
  const source = getFirestore(undefined, SOURCE_DB);
  const dest = getFirestore(undefined, DEST_DB);
  const bucket = getStorage().bucket(BUCKET);

  const destSnap = await dest.collection('vehicles').get();
  console.log(
    `Scanning ${destSnap.size} vehicles on ${DEST_DB} (source=${SOURCE_DB}, dryRun=${DRY_RUN})`
  );

  let repaired = 0;
  let skipped = 0;

  for (const destDoc of destSnap.docs) {
    const destData = destDoc.data() || {};
    const urls = collectHttpUrls(
      MEDIA_FIELDS.reduce((acc, key) => {
        acc[key] = destData[key];
        return acc;
      }, {})
    );

    const missing = await countMissingStorageUrls(urls, bucket);
    if (missing === 0) {
      skipped += 1;
      continue;
    }

    const sourceDoc = await source.collection('vehicles').doc(destDoc.id).get();
    if (!sourceDoc.exists) {
      console.warn(`  skip ${destDoc.id}: ${missing} missing URLs, no source doc`);
      continue;
    }

    const sourceData = sourceDoc.data() || {};
    const patch = {};
    for (const field of MEDIA_FIELDS) {
      if (sourceData[field] !== undefined) {
        patch[field] = sourceData[field];
      }
    }

    // Prefer pitch blocks from source when present (may embed image URLs).
    if (sourceData.pitch !== undefined) {
      patch.pitch = sourceData.pitch;
    }

    console.log(
      `  repair ${destDoc.id}: ${missing} missing Storage object(s) → copy media from ${SOURCE_DB}`
    );
    if (!DRY_RUN) {
      await dest.collection('vehicles').doc(destDoc.id).update(patch);
    }
    repaired += 1;
  }

  console.log(JSON.stringify({ repaired, skipped, dryRun: DRY_RUN }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
