import { useContext, useState, type ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';
import type { FavoriteItem, VerificationTier } from '../../schemas';
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
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
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
  buyerName,
  buyerEmail,
  buyerPhone,
}: {
  isLoggedIn: boolean;
  verificationTier: VerificationTier;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { count, items, isLoading, refresh, isFavorite, toggle } = useFavorites();

  const handleClearQuotedItems = async (quotedItems: FavoriteItem[]) => {
    for (const item of quotedItems) {
      if (isFavorite(item.id)) {
        await toggle(item);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-red-700"
        aria-label="Request quote"
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
        favoriteItems={items}
        isLoadingFavorites={isLoading}
        buyerName={buyerName}
        buyerEmail={buyerEmail}
        buyerPhone={buyerPhone}
        onClearQuotedItems={handleClearQuotedItems}
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
  buyerName,
  buyerEmail,
  buyerPhone,
}: ContactSellerFabProps) {
  return (
    <OptionalFavoritesBoundary
      isLoggedIn={isLoggedIn}
      verificationTier={verificationTier}
      initialSavedIds={initialSavedIds}
    >
      <ContactSellerFabInner
        isLoggedIn={isLoggedIn}
        verificationTier={verificationTier}
        buyerName={buyerName}
        buyerEmail={buyerEmail}
        buyerPhone={buyerPhone}
      />
    </OptionalFavoritesBoundary>
  );
}
