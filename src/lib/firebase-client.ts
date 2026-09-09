import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

function requirePublicEnv(value: unknown, name: string): string {
  if (!value || typeof value !== 'string') {
    throw new Error(
      `Missing ${name}. Set it in .env (see .env.example). Client-only — do not import from Astro SSR frontmatter.`
    );
  }
  return value;
}

// Vite/Astro only inlines statically referenced `import.meta.env.PUBLIC_*` keys.
// Dynamic access like `import.meta.env[name]` is stripped at build time and breaks Vercel.
const firebaseConfig = {
  apiKey: requirePublicEnv(import.meta.env.PUBLIC_FIREBASE_API_KEY, 'PUBLIC_FIREBASE_API_KEY'),
  authDomain: requirePublicEnv(
    import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    'PUBLIC_FIREBASE_AUTH_DOMAIN'
  ),
  projectId: requirePublicEnv(
    import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    'PUBLIC_FIREBASE_PROJECT_ID'
  ),
  appId: requirePublicEnv(import.meta.env.PUBLIC_FIREBASE_APP_ID, 'PUBLIC_FIREBASE_APP_ID'),
  messagingSenderId: requirePublicEnv(
    import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    'PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  ),
  storageBucket: requirePublicEnv(
    import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    'PUBLIC_FIREBASE_STORAGE_BUCKET'
  ),
};

const app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
