import './load-env';
import { initializeApp, cert, getApps, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

type AdminBucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

let db: Firestore | undefined;
let adminAuth: Auth | undefined;
let bucket: AdminBucket | undefined;

function readEnv(name: string): string | undefined {
  // Prefer process.env first so Vercel Sensitive (runtime-only) secrets win over
  // build-time-empty import.meta.env placeholders.
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[name];
  return fromMeta || undefined;
}

function resolveStorageBucket(projectId?: string, serviceAccountBucket?: string): string {
  const storageBucket =
    readEnv('FIREBASE_STORAGE_BUCKET') ??
    serviceAccountBucket ??
    // Prefer the post-Oct-2024 default bucket name when env/service-account omit it.
    (projectId ? `${projectId}.firebasestorage.app` : undefined);

  if (!storageBucket) {
    throw new Error(
      'Missing Firebase Storage bucket. Set FIREBASE_STORAGE_BUCKET or FIREBASE_PROJECT_ID.'
    );
  }

  return storageBucket;
}

function resolveServiceAccount(): {
  credential: ServiceAccount;
  projectId?: string;
  storageBucket?: string;
} {
  const serviceAccountString =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || import.meta.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountString) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(serviceAccountString);
      return {
        credential: parsed as ServiceAccount,
        projectId: typeof parsed.project_id === 'string' ? parsed.project_id : undefined,
        storageBucket: typeof parsed.storage_bucket === 'string' ? parsed.storage_bucket : undefined,
      };
    } catch {
      // Fall through to discrete credentials when the JSON env value is malformed.
    }
  }

  const projectId = readEnv('FIREBASE_PROJECT_ID');
  const clientEmail = readEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = readEnv('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return {
      credential: { projectId, clientEmail, privateKey },
      projectId,
    };
  }

  throw new Error(
    'CRITICAL: Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.'
  );
}

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const { credential, projectId: accountProjectId, storageBucket: accountBucket } =
    resolveServiceAccount();
  const projectId = readEnv('FIREBASE_PROJECT_ID') ?? accountProjectId;
  const storageBucket = resolveStorageBucket(projectId, accountBucket);

  return initializeApp({
    credential: cert(credential),
    projectId,
    storageBucket,
  });
}

/** Named DB used by this app (see firebase.json). Avoids the empty `(default)` DB. */
export const DEFAULT_FIRESTORE_DATABASE_ID = 'sellbyowner-prod';

export function getDb(): Firestore {
  if (!db) {
    const app = initAdmin();
    // Prefer explicit env, then the production named database — never silently fall back to
    // `(default)`, which diverges from migrated listing/media data and serves stale Storage URLs.
    const databaseId = readEnv('FIRESTORE_DATABASE_ID') || DEFAULT_FIRESTORE_DATABASE_ID;
    db = getFirestore(app, databaseId);
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
