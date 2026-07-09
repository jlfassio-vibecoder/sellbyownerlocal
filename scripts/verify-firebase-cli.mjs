#!/usr/bin/env node
/**
 * Diagnose Firebase CLI vs runtime credentials for sellbyownerlocal.
 * Run: node scripts/verify-firebase-cli.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const root = resolve(import.meta.dirname, '..');
const firebaserc = JSON.parse(readFileSync(resolve(root, '.firebaserc'), 'utf8'));
const projectId = firebaserc.projects?.default;

console.log('=== sellbyownerlocal Firebase diagnostics ===\n');
console.log(`Configured project (.firebaserc): ${projectId}`);

let cliOk = false;
try {
  const out = execSync(`firebase use ${projectId}`, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  console.log('Firebase CLI project access: OK');
  console.log(out.trim());
  cliOk = true;
} catch (error) {
  const message = error.stderr?.toString() || error.message;
  console.log('Firebase CLI project access: FAILED');
  console.log(message.trim());
}

const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credsPath || !existsSync(credsPath)) {
  console.log('\nGOOGLE_APPLICATION_CREDENTIALS: not set or file missing');
  console.log('Set it in .env to your service account JSON path.');
} else {
  try {
    const sa = JSON.parse(readFileSync(credsPath, 'utf8'));
    const databaseId =
      process.env.FIRESTORE_DATABASE_ID ||
      'ai-studio-ram1500-a6aad1c3-783c-48e0-a179-f80c48018571';
    const app = initializeApp({
      credential: cert(sa),
      projectId: sa.project_id ?? projectId,
    });
    const db = getFirestore(app, databaseId);
    const collections = await db.listCollections();
    console.log('\nService account Firestore access: OK');
    console.log(`Database: ${databaseId}`);
    console.log(`Collections: ${collections.map((c) => c.id).join(', ')}`);
  } catch (error) {
    console.log('\nService account Firestore access: FAILED');
    console.log(error.message);
  }
}

console.log('\n=== Next steps if CLI access failed ===');
if (!cliOk) {
  const accounts = execSync('firebase login:list', { encoding: 'utf8' });
  const hasWorkoutAccount = accounts.includes('justin@aiworkoutgen.app');
  console.log(
    '1. Switch to the Google account that owns this Firebase project:'
  );
  console.log('   firebase login:use justin@aiworkoutgen.app');
  if (!hasWorkoutAccount) {
    console.log('   (If missing, run: firebase login:add)');
  }
  console.log(`2. Select the project: firebase use ${projectId}`);
  console.log('3. Or ask the project owner to add your Gmail in');
  console.log('   Firebase Console → Project settings → Users and permissions.');
  console.log('4. Re-run: firebase init functions');
  console.log(
    '\nNote: firebase login:add alone is not enough — the active account must have project access.'
  );
  console.log(
    'Note: gen-lang-client-0094274359 is a separate Gemini GCP project without Firebase enabled.'
  );
}
