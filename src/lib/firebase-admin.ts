import './load-env';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

type AdminBucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

let db: Firestore | undefined;
let adminAuth: Auth | undefined;
let bucket: AdminBucket | undefined;

function readEnv(name: string): string | undefined {
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[name];
  const fromProcess = process.env[name];
  return fromMeta || fromProcess;
}

function resolveStorageBucket(projectId?: string, serviceAccountBucket?: string): string {
  const storageBucket =
    readEnv('FIREBASE_STORAGE_BUCKET') ??
    serviceAccountBucket ??
    (projectId ? `${projectId}.appspot.com` : undefined);

  if (!storageBucket) {
    throw new Error(
      'Missing Firebase Storage bucket. Set FIREBASE_STORAGE_BUCKET or FIREBASE_PROJECT_ID.'
    );
  }

  return storageBucket;
}

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const serviceAccountString =
    import.meta.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountString) {
    throw new Error('CRITICAL: Missing FIREBASE_SERVICE_ACCOUNT_JSON environment variable.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountString);
  } catch {
    throw new Error(
      'CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it is a valid JSON string.'
    );
  }

  const projectId = readEnv('FIREBASE_PROJECT_ID') ?? serviceAccount.project_id;
  const storageBucket = resolveStorageBucket(projectId, serviceAccount.storage_bucket);

  return initializeApp({
    credential: cert(serviceAccount),
    projectId,
    storageBucket,
  });
}

export function getDb(): Firestore {
  if (!db) {
    const app = initAdmin();
    const databaseId = readEnv('FIRESTORE_DATABASE_ID');
    db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
  return db;
}

export function auth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(initAdmin());
  }
  return adminAuth;
}

export function storageBucket(): AdminBucket {
  if (!bucket) {
    const app = initAdmin();
    const projectId = readEnv('FIREBASE_PROJECT_ID');
    const bucketName = resolveStorageBucket(projectId);
    bucket = getStorage(app).bucket(bucketName);
  }
  return bucket;
}

export { getDb as db };
