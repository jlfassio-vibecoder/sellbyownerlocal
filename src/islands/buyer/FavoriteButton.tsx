import { useEffect, useState, type MouseEvent } from 'react';
import { Heart } from 'lucide-react';
import type { VerificationTier } from '../../schemas';
import { useSaveFavorite } from '../../lib/use-save-favorite';
import {
  isGuestFavorite,
  subscribeGuestFavorites,
  toggleGuestFavorite,
  type FavoriteCategory,
} from '../../utils/favorites';

interface FavoriteButtonProps {
  itemId: string;
  title: string;
  price: number;
  category: FavoriteCategory;
  sellerId: string;
  isLoggedIn?: boolean;
  verificationTier?: VerificationTier;
}

export default function FavoriteButton({
  itemId,
  title,
  price,
  category,
  sellerId,
  isLoggedIn = false,
  verificationTier = 'anonymous',
}: FavoriteButtonProps) {
  const canSave = isLoggedIn && verificationTier !== 'anonymous';
  const isGuest = !isLoggedIn;

  const [guestSaved, setGuestSaved] = useState(false);

  const { saved: firebaseSaved, isSaving, toggleSave } = useSaveFavorite({
    itemId,
    category,
    canSave,
    fetchOnMount: canSave,
  });

  const saved = isGuest ? guestSaved : firebaseSaved;

  useEffect(() => {
    if (!isGuest) return;

    setGuestSaved(isGuestFavorite(itemId));
    return subscribeGuestFavorites(() => {
      setGuestSaved(isGuestFavorite(itemId));
    });
  }, [isGuest, itemId]);

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isGuest) {
      toggleGuestFavorite({ id: itemId, title, price, category, sellerId });
      setGuestSaved(isGuestFavorite(itemId));
      return;
    }

    if (!canSave) return;

    void toggleSave();
  };

  const itemLabel = category === 'vehicle' ? 'vehicle' : 'item';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoggedIn && (!canSave || isSaving)}
      className="rounded-full bg-white/80 p-2 shadow-sm backdrop-blur-sm transition-transform hover:scale-105 disabled:opacity-60"
      aria-label={saved ? `Unsave this ${itemLabel}` : `Save this ${itemLabel}`}
      aria-pressed={saved}
      title={
        !canSave && isLoggedIn
          ? 'Verify phone to save'
          : saved
            ? 'Saved'
            : 'Save listing'
      }
    >
      <Heart
        size={20}
        className={saved ? 'fill-current text-red-600' : 'text-slate-700'}
      />
    </button>
  );
}
