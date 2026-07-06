#!/usr/bin/env node
/**
 * Grant the Firebase custom claim { dealer: true } to a user.
 * Usage: node scripts/grant-dealer.mjs <firebase-uid>
 *
 * Credentials (same options as the app — see .env.example):
 *   - GOOGLE_APPLICATION_CREDENTIALS  path to service account JSON
 *   - FIREBASE_SERVICE_ACCOUNT_JSON   inline JSON string
 */
import 'dotenv/config';
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const uid = process.argv[2]?.trim();

if (!uid) {
  console.error('Usage: node scripts/grant-dealer.mjs <firebase-uid>');
  process.exit(1);
}

function initAdmin() {
  if (getApps().length > 0) return getApps()[0];

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

initAdmin();
const auth = getAuth();

const user = await auth.getUser(uid);
const existingClaims = user.customClaims ?? {};

await auth.setCustomUserClaims(uid, { ...existingClaims, dealer: true });

console.log(`Granted dealer claim to ${uid} (${user.email ?? 'no email'})`);
console.log('Sign out and sign back in (or wait for token refresh) for the claim to take effect.');
