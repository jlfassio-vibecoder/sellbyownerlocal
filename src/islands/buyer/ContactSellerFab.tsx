import { useCallback, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ContactSellerModal from './ContactSellerModal';
import { getGuestFavorites, subscribeGuestFavorites } from '../../utils/favorites';

interface ContactSellerFabProps {
  isLoggedIn: boolean;
}

async function fetchFavoriteCount(isLoggedIn: boolean): Promise<number> {
  if (!isLoggedIn) {
    return getGuestFavorites().length;
  }

  const res = await fetch('/api/favorites', { credentials: 'same-origin' });
  if (!res.ok) return 0;

  const data = await res.json();
  return Array.isArray(data.items) ? data.items.length : 0;
}

export default function ContactSellerFab({ isLoggedIn }: ContactSellerFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);

  const refreshCount = useCallback(async () => {
    setFavoriteCount(await fetchFavoriteCount(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    void refreshCount();

    if (!isLoggedIn) {
      return subscribeGuestFavorites(() => {
        setFavoriteCount(getGuestFavorites().length);
      });
    }
  }, [isLoggedIn, refreshCount]);

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
        {favoriteCount > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-red-600">
            {favoriteCount}
          </span>
        )}
      </button>

      <ContactSellerModal
        isOpen={isOpen}
        isLoggedIn={isLoggedIn}
        onClose={() => {
          setIsOpen(false);
          void refreshCount();
        }}
      />
    </>
  );
}
