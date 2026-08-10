import { useContext, useState, type ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';
import type { FavoriteItem, VerificationTier } from '../../schemas';
import {
  FavoritesContext,
  FavoritesProvider,
  useFavorites,
} from '../../context/FavoritesContext';
import ContactSellerModal from './ContactSellerModal';
import { trackQuoteOpen } from '../../lib/listing-analytics-client';

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
  buyerName,
  buyerEmail,
  buyerPhone,
}: {
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { count, items, isLoading, refresh, isFavorite, toggle } = useFavorites();

  const handleClearQuotedItems = async (quotedItems: FavoriteItem[]) => {
    await Promise.all(
      quotedItems.filter((item) => isFavorite(item.id)).map((item) => toggle(item))
    );
  };

  const handleOpen = () => {
    setIsOpen(true);
    const bySeller = new Map<string, number>();
    for (const item of items) {
      if (!item.sellerId || item.category !== 'clothing') continue;
      bySeller.set(item.sellerId, (bySeller.get(item.sellerId) ?? 0) + 1);
    }
    for (const [sellerId, favoriteCount] of bySeller) {
      trackQuoteOpen({ sellerId, favoriteCount });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
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
        buyerName={buyerName}
        buyerEmail={buyerEmail}
        buyerPhone={buyerPhone}
      />
    </OptionalFavoritesBoundary>
  );
}
