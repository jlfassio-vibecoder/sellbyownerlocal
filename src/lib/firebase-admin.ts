import './load-env';
import { initializeApp, applicationDefault, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

type AdminBucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

let db: Firestore | undefined;
let adminAuth: Auth | undefined;
let bucket: AdminBucket | undefined;

function resolveStorageBucket(projectId?: string, serviceAccountBucket?: string): string {
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ??
    serviceAccountBucket ??
    (projectId ? `${projectId}.appspot.com` : undefined);

  if (!storageBucket) {
    throw new Error(
      'Missing Firebase Storage bucket. Set FIREBASE_STORAGE_BUCKET or FIREBASE_PROJECT_ID.'
    );
  }

  return storageBucket;
}

function formatPrivateKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\\n/g, '\n');
}

function getCertFromEnvVars():
  | { projectId: string; clientEmail: string; privateKey: string }
  | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;

  const envCert = getCertFromEnvVars();
  if (envCert) {
    const storageBucket = resolveStorageBucket(envCert.projectId);
    return initializeApp({
      credential: cert(envCert),
      projectId: envCert.projectId,
      storageBucket,
    });
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    const storageBucket = resolveStorageBucket(projectId ?? sa.project_id, sa.storage_bucket);
    return initializeApp({
      credential: cert(sa),
      projectId: projectId ?? sa.project_id,
      storageBucket,
    });
  }

  if (process.env.K_SERVICE) {
    const storageBucket = resolveStorageBucket(projectId);
    return initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
  }

  throw new Error(
    'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, FIREBASE_SERVICE_ACCOUNT_JSON, or deploy to Cloud Run with a service account that has Firebase access.'
  );
}

export function getDb(): Firestore {
  if (!db) {
    const app = initAdmin();
    const databaseId = process.env.FIRESTORE_DATABASE_ID;
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
    const projectId = process.env.FIREBASE_PROJECT_ID;
    let serviceAccountBucket: string | undefined;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccountBucket = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON).storage_bucket;
      } catch {
        serviceAccountBucket = undefined;
      }
    }
    const bucketName = resolveStorageBucket(projectId, serviceAccountBucket);
    bucket = getStorage(app).bucket(bucketName);
  }
  return bucket;
}

export { getDb as db };
