import { Heart } from 'lucide-react';
import type { VerificationTier } from '../schemas';
import { FavoritesProvider, useFavorites } from '../context/FavoritesContext';

interface SaveVehicleButtonProps {
  vehicleId: string;
  title: string;
  price: number;
  sellerId: string;
  isLoggedIn: boolean;
  verificationTier: VerificationTier;
  loginHref: string;
  initialSaved?: boolean;
}

function SaveVehicleButtonInner({
  vehicleId,
  title,
  price,
  sellerId,
}: Pick<SaveVehicleButtonProps, 'vehicleId' | 'title' | 'price' | 'sellerId'>) {
  const { isFavorite, toggle, error } = useFavorites();
  const saved = isFavorite(vehicleId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          void toggle({
            id: vehicleId,
            title,
            price,
            category: 'vehicle',
            sellerId,
          })
        }
        className={`flex items-center gap-1.5 transition-colors ${
          saved ? 'text-rose-400 hover:text-rose-300' : 'text-slate-400 hover:text-white'
        }`}
        aria-label={saved ? 'Unsave this vehicle' : 'Save this vehicle'}
        aria-pressed={saved}
        title={error ? error : saved ? 'Saved' : 'Save listing'}
      >
        <Heart size={20} className={saved ? 'fill-current' : undefined} />
        <span className="hidden text-sm font-medium lg:inline">{saved ? 'Saved' : 'Save'}</span>
      </button>
      {error && (
        <span className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-rose-300">
          {error}
        </span>
      )}
    </div>
  );
}

export default function SaveVehicleButton({
  vehicleId,
  title,
  price,
  sellerId,
  isLoggedIn,
  verificationTier,
  loginHref,
  initialSaved = false,
}: SaveVehicleButtonProps) {
  // Guests can still save via FavoritesProvider (device store). Keep login link
  // only as a secondary affordance when explicitly browsing without a session
  // and we want to nudge account creation — but favorites work either way.
  if (!isLoggedIn) {
    return (
      <FavoritesProvider isLoggedIn={false} verificationTier="anonymous">
        <div className="flex items-center gap-3">
          <SaveVehicleButtonInner
            vehicleId={vehicleId}
            title={title}
            price={price}
            sellerId={sellerId}
          />
          <a
            href={loginHref}
            className="hidden text-xs text-slate-500 transition-colors hover:text-white lg:inline"
          >
            Log in
          </a>
        </div>
      </FavoritesProvider>
    );
  }

  return (
    <FavoritesProvider
      isLoggedIn={isLoggedIn}
      verificationTier={verificationTier}
      initialSavedIds={initialSaved ? [vehicleId] : []}
    >
      <SaveVehicleButtonInner
        vehicleId={vehicleId}
        title={title}
        price={price}
        sellerId={sellerId}
      />
    </FavoritesProvider>
  );
}
