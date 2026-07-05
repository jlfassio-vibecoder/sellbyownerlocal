#!/usr/bin/env node
/**
 * Grant the Firebase custom claim { dealer: true } to a user.
 * Usage: node scripts/grant-dealer.mjs <firebase-uid>
 */
import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const uid = process.argv[2]?.trim();

if (!uid) {
  console.error('Usage: node scripts/grant-dealer.mjs <firebase-uid>');
  process.exit(1);
}

function initAdmin() {
  if (getApps().length > 0) return getApps()[0];

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return initializeApp({
      credential: cert(sa),
      projectId: process.env.FIREBASE_PROJECT_ID ?? sa.project_id,
    });
  }

  throw new Error(
    'Set FIREBASE_SERVICE_ACCOUNT_JSON (and optionally FIREBASE_PROJECT_ID) before running this script.'
  );
}

initAdmin();
const auth = getAuth();

const user = await auth.getUser(uid);
const existingClaims = user.customClaims ?? {};

await auth.setCustomUserClaims(uid, { ...existingClaims, dealer: true });

console.log(`Granted dealer claim to ${uid} (${user.email ?? 'no email'})`);
