import { useContext, useState, type MouseEvent, type ReactNode } from 'react';
import { Heart } from 'lucide-react';
import type { VerificationTier } from '../../schemas';
import {
  FavoritesProvider,
  useFavorites,
  FavoritesContext,
} from '../../context/FavoritesContext';
import type { FavoriteCategory } from '../../utils/favorites';

interface FavoriteButtonProps {
  itemId: string;
  title: string;
  price: number;
  category: FavoriteCategory;
  sellerId: string;
  isLoggedIn?: boolean;
  verificationTier?: VerificationTier;
  /** SSR-known saved state for this item (verified users). */
  initialSaved?: boolean;
}

function FavoriteButtonInner({
  itemId,
  title,
  price,
  category,
  sellerId,
}: Omit<FavoriteButtonProps, 'isLoggedIn' | 'verificationTier' | 'initialSaved'>) {
  const { isFavorite, toggle, error } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);
  const saved = isFavorite(itemId);
  const itemLabel = category === 'vehicle' ? 'vehicle' : 'item';

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isToggling) return;

    void (async () => {
      setIsToggling(true);
      try {
        await toggle({ id: itemId, title, price, category, sellerId });
      } finally {
        setIsToggling(false);
      }
    })();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isToggling}
      className="rounded-full bg-white/80 p-2 shadow-sm backdrop-blur-sm transition-transform hover:scale-105 disabled:opacity-60"
      aria-label={saved ? `Unsave this ${itemLabel}` : `Save this ${itemLabel}`}
      aria-pressed={saved}
      title={error ? error : saved ? 'Saved' : 'Save listing'}
    >
      <Heart
        size={20}
        className={saved ? 'fill-current text-red-600' : 'text-slate-700'}
      />
    </button>
  );
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

export default function FavoriteButton({
  itemId,
  title,
  price,
  category,
  sellerId,
  isLoggedIn = false,
  verificationTier = 'anonymous',
  initialSaved = false,
}: FavoriteButtonProps) {
  return (
    <OptionalFavoritesBoundary
      isLoggedIn={isLoggedIn}
      verificationTier={verificationTier}
      initialSavedIds={initialSaved ? [itemId] : []}
    >
      <FavoriteButtonInner
        itemId={itemId}
        title={title}
        price={price}
        category={category}
        sellerId={sellerId}
      />
    </OptionalFavoritesBoundary>
  );
}
