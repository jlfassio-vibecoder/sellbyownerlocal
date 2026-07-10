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

  const projectId = import.meta.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = import.meta.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = import.meta.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  console.log(
    `[DEBUG] ProjectID exists: ${!!projectId}, Email exists: ${!!clientEmail}, Key exists: ${!!rawPrivateKey}`
  );

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(
      `CRITICAL: Vercel Env Vars missing! ProjectID: ${!!projectId}, Email: ${!!clientEmail}, Key: ${!!rawPrivateKey}`
    );
  }

  const formattedPrivateKey = rawPrivateKey.replace(/\\n/g, '\n');
  const storageBucket = resolveStorageBucket(projectId);

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    }),
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
