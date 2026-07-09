import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

function getRequiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value || typeof value !== 'string') {
    throw new Error(
      `Missing ${name}. Set it in .env (see .env.example). Client-only — do not import from Astro SSR frontmatter.`
    );
  }
  return value;
}

const firebaseConfig = {
  apiKey: getRequiredEnv('PUBLIC_FIREBASE_API_KEY'),
  authDomain: getRequiredEnv('PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getRequiredEnv('PUBLIC_FIREBASE_PROJECT_ID'),
  appId: getRequiredEnv('PUBLIC_FIREBASE_APP_ID'),
  messagingSenderId: getRequiredEnv('PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  storageBucket: getRequiredEnv('PUBLIC_FIREBASE_STORAGE_BUCKET'),
};

const app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
