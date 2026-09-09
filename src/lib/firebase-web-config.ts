/**
 * Resolve Firebase web app config for browser + SSR.
 * Supports:
 * 1) Vite-inlined PUBLIC_* (non-Sensitive Vercel env / local .env)
 * 2) Runtime process.env (Vercel Sensitive env on the server)
 * 3) window.__SBOL_FIREBASE_CONFIG__ injected by Layout.astro for the browser
 */

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  storageBucket: string;
};

declare global {
  interface Window {
    __SBOL_FIREBASE_CONFIG__?: Partial<FirebaseWebConfig>;
  }
}

const PUBLIC_KEYS = [
  'PUBLIC_FIREBASE_API_KEY',
  'PUBLIC_FIREBASE_AUTH_DOMAIN',
  'PUBLIC_FIREBASE_PROJECT_ID',
  'PUBLIC_FIREBASE_APP_ID',
  'PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'PUBLIC_FIREBASE_STORAGE_BUCKET',
] as const;

type PublicKey = (typeof PUBLIC_KEYS)[number];

function readProcessEnv(name: PublicKey): string | undefined {
  if (typeof process === 'undefined') return undefined;
  const value = process.env[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readWindowConfig(): Partial<FirebaseWebConfig> {
  if (typeof window === 'undefined') return {};
  return window.__SBOL_FIREBASE_CONFIG__ ?? {};
}

function pick(
  buildTime: unknown,
  processName: PublicKey,
  windowValue: unknown
): string | undefined {
  if (typeof buildTime === 'string' && buildTime.length > 0) return buildTime;
  const fromProcess = readProcessEnv(processName);
  if (fromProcess) return fromProcess;
  if (typeof windowValue === 'string' && windowValue.length > 0) return windowValue;
  return undefined;
}

/** Server-only: build the config object for Layout injection. */
export function getFirebaseWebConfigForSsr(): FirebaseWebConfig | null {
  const apiKey = readProcessEnv('PUBLIC_FIREBASE_API_KEY');
  const authDomain = readProcessEnv('PUBLIC_FIREBASE_AUTH_DOMAIN');
  const projectId = readProcessEnv('PUBLIC_FIREBASE_PROJECT_ID');
  const appId = readProcessEnv('PUBLIC_FIREBASE_APP_ID');
  const messagingSenderId = readProcessEnv('PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  const storageBucket = readProcessEnv('PUBLIC_FIREBASE_STORAGE_BUCKET');

  if (!apiKey || !authDomain || !projectId || !appId || !messagingSenderId || !storageBucket) {
    return null;
  }

  return { apiKey, authDomain, projectId, appId, messagingSenderId, storageBucket };
}

export function resolveFirebaseWebConfig(): FirebaseWebConfig {
  const fromWindow = readWindowConfig();

  const apiKey = pick(
    import.meta.env.PUBLIC_FIREBASE_API_KEY,
    'PUBLIC_FIREBASE_API_KEY',
    fromWindow.apiKey
  );
  const authDomain = pick(
    import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    'PUBLIC_FIREBASE_AUTH_DOMAIN',
    fromWindow.authDomain
  );
  const projectId = pick(
    import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    'PUBLIC_FIREBASE_PROJECT_ID',
    fromWindow.projectId
  );
  const appId = pick(import.meta.env.PUBLIC_FIREBASE_APP_ID, 'PUBLIC_FIREBASE_APP_ID', fromWindow.appId);
  const messagingSenderId = pick(
    import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    'PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    fromWindow.messagingSenderId
  );
  const storageBucket = pick(
    import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    'PUBLIC_FIREBASE_STORAGE_BUCKET',
    fromWindow.storageBucket
  );

  if (!apiKey || !authDomain || !projectId || !appId || !messagingSenderId || !storageBucket) {
    throw new Error(
      'Missing PUBLIC_FIREBASE_* config. On Vercel, either make those env vars non-Sensitive (Build + Runtime), or ensure Layout can read them from process.env at request time.'
    );
  }

  return { apiKey, authDomain, projectId, appId, messagingSenderId, storageBucket };
}
