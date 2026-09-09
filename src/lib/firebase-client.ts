import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { resolveFirebaseWebConfig } from './firebase-web-config';

const firebaseConfig = resolveFirebaseWebConfig();
const app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
