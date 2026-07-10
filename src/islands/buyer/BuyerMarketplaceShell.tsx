import type { ReactNode } from 'react';
import type { VerificationTier } from '../../schemas';
import { FavoritesProvider } from '../../context/FavoritesContext';
import ContactSellerFab from './ContactSellerFab';

export interface BuyerMarketplaceShellProps {
  isLoggedIn: boolean;
  verificationTier?: VerificationTier;
  initialSavedIds?: string[];
  /** When true, also render the Request Quote FAB. */
  showFab?: boolean;
  children?: ReactNode;
}

/**
 * Shared buyer marketplace shell: one FavoritesProvider for the island tree,
 * plus the Contact Seller FAB.
 *
 * Use this to wrap React grids (ClothingInventoryGrid, InventoryGrid) so all
 * FavoriteButtons share one provider. On Astro pages that only need the FAB,
 * render with showFab and no children.
 */
export default function BuyerMarketplaceShell({
  isLoggedIn,
  verificationTier = 'anonymous',
  initialSavedIds = [],
  showFab = true,
  children,
}: BuyerMarketplaceShellProps) {
  return (
    <FavoritesProvider
      isLoggedIn={isLoggedIn}
      verificationTier={verificationTier}
      initialSavedIds={initialSavedIds}
    >
      {children}
      {showFab ? (
        <ContactSellerFab
          isLoggedIn={isLoggedIn}
          verificationTier={verificationTier}
          initialSavedIds={initialSavedIds}
        />
      ) : null}
    </FavoritesProvider>
  );
}
