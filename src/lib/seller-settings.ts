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

/** Read hideItemDetails; missing defaults to false (click-through allowed). */
export async function getSellerHideItemDetails(sellerId: string): Promise<boolean> {
  const profile = await getUserProfile(sellerId);
  return profile?.hideItemDetails === true;
}

/** Persist hideItemDetails on the seller's users/{uid} document. */
export async function updateSellerHideItemDetails(
  sellerId: string,
  hideItemDetails: boolean
): Promise<void> {
  await db().collection('users').doc(sellerId).set({ hideItemDetails }, { merge: true });
}

/** Read hideListingsBackLink; missing defaults to false (back link visible). */
export async function getSellerHideListingsBackLink(sellerId: string): Promise<boolean> {
  const profile = await getUserProfile(sellerId);
  return profile?.hideListingsBackLink === true;
}

/** Persist hideListingsBackLink on the seller's users/{uid} document. */
export async function updateSellerHideListingsBackLink(
  sellerId: string,
  hideListingsBackLink: boolean
): Promise<void> {
  await db().collection('users').doc(sellerId).set({ hideListingsBackLink }, { merge: true });
}
