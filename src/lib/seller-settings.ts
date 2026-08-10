import { db } from './firebase-admin';
import { getUserProfile } from './buyer-profile';

/** Read hideFab for a seller; missing/invalid profile defaults to false (FAB visible). */
export async function getSellerHideFab(sellerId: string): Promise<boolean> {
  const profile = await getUserProfile(sellerId);
  return profile?.hideFab === true;
}

/** Persist hideFab on the seller's users/{uid} document. */
export async function updateSellerHideFab(sellerId: string, hideFab: boolean): Promise<void> {
  await db().collection('users').doc(sellerId).set({ hideFab }, { merge: true });
}
