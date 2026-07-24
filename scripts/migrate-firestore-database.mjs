/**
 * Migrate all top-level Firestore documents between databases in the same project.
 *
 * This app stores data in flat top-level collections (no nested subcollections).
 * Subcollection walks are disabled by default because listCollections() burns
 * AI Studio shared quota and is not needed for this schema.
 *
 * Usage:
 *   node --env-file=.env scripts/migrate-firestore-database.mjs
 *
 * Env (optional overrides):
 *   FIRESTORE_MIGRATE_SOURCE  default: ai-studio-ram1500-a6aad1c3-783c-48e0-a179-f80c48018571
 *   FIRESTORE_MIGRATE_DEST    default: FIRESTORE_DATABASE_ID or sellbyowner-prod
 *   FIRESTORE_MIGRATE_DRY_RUN=1
 *   FIRESTORE_MIGRATE_INCLUDE_SUBS=1  walk nested subcollections (expensive)
 *   FIRESTORE_MIGRATE_ONLY=vehicles,users  comma-separated collection allowlist
 */
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';

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

const SOURCE_DB =
  process.env.FIRESTORE_MIGRATE_SOURCE ||
  'ai-studio-ram1500-a6aad1c3-783c-48e0-a179-f80c48018571';
const DEST_DB =
  process.env.FIRESTORE_MIGRATE_DEST ||
  process.env.FIRESTORE_DATABASE_ID ||
  'sellbyowner-prod';
const DRY_RUN = process.env.FIRESTORE_MIGRATE_DRY_RUN === '1';
const INCLUDE_SUBS = process.env.FIRESTORE_MIGRATE_INCLUDE_SUBS === '1';
const ONLY = new Set(
  (process.env.FIRESTORE_MIGRATE_ONLY || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);
const PAGE_SIZE = 50;
const BATCH_SIZE = 200;
const PAGE_PAUSE_MS = 250;
const MAX_RETRIES = 20;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    error?.code === 8 ||
    /RESOURCE_EXHAUSTED|Quota (limit )?exceeded/i.test(message)
  );
}

async function withRetry(label, fn) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (!isQuotaError(error) || attempt > MAX_RETRIES) throw error;
      const waitMs = Math.min(90_000, 3_000 * 2 ** Math.min(attempt - 1, 5));
      console.warn(
        `[retry ${attempt}/${MAX_RETRIES}] ${label}: quota exhausted, waiting ${Math.round(waitMs / 1000)}s…`
      );
      await sleep(waitMs);
    }
  }
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
if (!serviceAccount.project_id) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const src = getFirestore(getApps()[0], SOURCE_DB);
const dest = getFirestore(getApps()[0], DEST_DB);

let copiedDocs = 0;
let copiedCollections = 0;

async function flushBatch(batchOps) {
  if (batchOps.length === 0) return;
  if (DRY_RUN) {
    copiedDocs += batchOps.length;
    batchOps.length = 0;
    return;
  }
  const batch = dest.batch();
  for (const { ref, data } of batchOps) {
    batch.set(ref, data, { merge: false });
  }
  await withRetry('batch.commit', () => batch.commit());
  copiedDocs += batchOps.length;
  batchOps.length = 0;
}

async function copyCollection(srcCol, destCol, pathLabel) {
  copiedCollections += 1;
  console.log(`→ ${pathLabel}`);

  let lastDoc = null;
  const batchOps = [];
  let page = 0;

  for (;;) {
    let query = srcCol.orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await withRetry(`read ${pathLabel} p${page + 1}`, () => query.get());
    if (snap.empty) break;
    page += 1;

    for (const doc of snap.docs) {
      batchOps.push({
        ref: destCol.doc(doc.id),
        data: doc.data(),
      });
      if (batchOps.length >= BATCH_SIZE) {
        await flushBatch(batchOps);
        console.log(`   ${pathLabel}: ${copiedDocs} docs total`);
      }

      if (INCLUDE_SUBS) {
        const subcols = await withRetry(`listSubs ${pathLabel}/${doc.id}`, () =>
          doc.ref.listCollections()
        );
        for (const sub of subcols) {
          await copyCollection(
            sub,
            destCol.doc(doc.id).collection(sub.id),
            `${pathLabel}/${doc.id}/${sub.id}`
          );
        }
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    await sleep(PAGE_PAUSE_MS);
    if (snap.size < PAGE_SIZE) break;
  }

  await flushBatch(batchOps);
  console.log(`   ${pathLabel}: done`);
}

async function main() {
  console.log(`Source: ${SOURCE_DB}`);
  console.log(`Dest:   ${DEST_DB}`);
  console.log(DRY_RUN ? 'Mode:   DRY RUN' : 'Mode:   WRITE');
  console.log(
    INCLUDE_SUBS
      ? 'Subs:   INCLUDE (expensive)'
      : 'Subs:   skip (flat collections only)'
  );

  await withRetry('dest ping', () => dest.collection('_migration').limit(1).get());
  console.log('Destination reachable.');

  // Prefer critical product data first while quota lasts.
  // Hardcoded to avoid source listCollections() (burns AI Studio quota).
  const priority = [
    'vehicles',
    'users',
    'storefront_slugs',
    'messages',
    'inquiries',
    'leads',
    'saved_vehicles',
    'saved_clothing',
    'clothing_listings',
    'clothing_inquiries',
    'listing_events',
    'apparel_image_matches',
    'truckDetails',
  ];

  let names = priority.slice();
  if (ONLY.size) {
    names = names.filter((id) => ONLY.has(id));
    for (const id of ONLY) {
      if (!names.includes(id)) names.push(id);
    }
  } else {
    // Optionally discover extra collections if quota allows; ignore failures.
    try {
      const top = await withRetry('list top collections', () => src.listCollections());
      for (const col of top) {
        if (!names.includes(col.id)) names.push(col.id);
      }
    } catch (error) {
      if (isQuotaError(error)) {
        console.warn(
          'Skipping source listCollections (quota); using known collection list only.'
        );
      } else {
        throw error;
      }
    }
  }

  console.log(`Migrating ${names.length} collection(s): ${names.join(', ')}`);

  for (const id of names) {
    await copyCollection(src.collection(id), dest.collection(id), id);
  }

  if (!DRY_RUN) {
    await dest.collection('_migration').doc('latest').set({
      source: SOURCE_DB,
      dest: DEST_DB,
      copiedDocs,
      copiedCollections,
      includeSubs: INCLUDE_SUBS,
      finishedAt: new Date().toISOString(),
    });
  }

  console.log(
    `\nDone. collections=${copiedCollections} docs=${copiedDocs}${DRY_RUN ? ' (dry run)' : ''}`
  );
}

main().catch((error) => {
  console.error('\nMigration failed:', error.message || error);
  if (isQuotaError(error)) {
    console.error(
      '\nThe source AI Studio database is over its shared free-tier daily read quota.'
    );
    console.error(
      'Wait for quota reset, then re-run (safe to re-run; docs are overwritten):\n  node --env-file=.env scripts/migrate-firestore-database.mjs'
    );
  }
  process.exit(1);
});
