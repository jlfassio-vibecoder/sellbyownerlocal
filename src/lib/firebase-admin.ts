import './load-env';
import { initializeApp, applicationDefault, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let db: Firestore | undefined;
let adminAuth: Auth | undefined;

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return initializeApp({
      credential: cert(sa),
      projectId: projectId ?? sa.project_id,
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
    return initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  throw new Error(
    'Missing Firebase Admin credentials. Set GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT_JSON, or deploy to Cloud Run with a service account that has Firebase access.'
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

export { getDb as db };
