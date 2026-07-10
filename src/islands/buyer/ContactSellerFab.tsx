import { useContext, useState, type ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';
import type { VerificationTier } from '../../schemas';
import {
  FavoritesContext,
  FavoritesProvider,
  useFavorites,
} from '../../context/FavoritesContext';
import ContactSellerModal from './ContactSellerModal';

interface ContactSellerFabProps {
  isLoggedIn: boolean;
  verificationTier?: VerificationTier;
  initialSavedIds?: string[];
}

function OptionalFavoritesBoundary({
  isLoggedIn,
  verificationTier,
  initialSavedIds,
  children,
}: {
  isLoggedIn: boolean;
  verificationTier: VerificationTier;
  initialSavedIds: string[];
  children: ReactNode;
}) {
  const existing = useContext(FavoritesContext);
  if (existing) return children;

  return (
    <FavoritesProvider
      isLoggedIn={isLoggedIn}
      verificationTier={verificationTier}
      initialSavedIds={initialSavedIds}
    >
      {children}
    </FavoritesProvider>
  );
}

function ContactSellerFabInner({
  isLoggedIn,
  verificationTier,
}: {
  isLoggedIn: boolean;
  verificationTier: VerificationTier;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { count, items, isLoading, refresh } = useFavorites();

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-red-700"
        aria-label="Contact seller"
      >
        <MessageCircle size={20} />
        Request Quote
        {count > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-red-600">
            {count}
          </span>
        )}
      </button>

      <ContactSellerModal
        isOpen={isOpen}
        isLoggedIn={isLoggedIn}
        verificationTier={verificationTier}
        favoriteItems={items}
        isLoadingFavorites={isLoading}
        onClose={() => {
          setIsOpen(false);
          void refresh();
        }}
      />
    </>
  );
}

export default function ContactSellerFab({
  isLoggedIn,
  verificationTier = 'anonymous',
  initialSavedIds = [],
}: ContactSellerFabProps) {
  return (
    <OptionalFavoritesBoundary
      isLoggedIn={isLoggedIn}
      verificationTier={verificationTier}
      initialSavedIds={initialSavedIds}
    >
      <ContactSellerFabInner isLoggedIn={isLoggedIn} verificationTier={verificationTier} />
    </OptionalFavoritesBoundary>
  );
}
