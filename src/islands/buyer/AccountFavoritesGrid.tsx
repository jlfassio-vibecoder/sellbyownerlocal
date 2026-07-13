import { useEffect, useState } from 'react';
import type { FavoriteItem, VerificationTier } from '../../schemas';
import VehicleCard from '../../components/buyer/VehicleCard';
import { FavoritesProvider } from '../../context/FavoritesContext';
import { fetchFavoritesFromServer } from '../../lib/favorites-client';
import type { InventoryVehicle } from '../../types/inventory-vehicle';

interface AccountFavoritesGridProps {
  isLoggedIn: boolean;
  verificationTier: VerificationTier;
  initialItems?: FavoriteItem[];
}

function favoriteToInventoryVehicle(item: FavoriteItem): InventoryVehicle {
  return {
    id: item.id,
    sellerId: item.sellerId,
    make: item.make ?? '',
    model: item.model ?? '',
    year: item.year ?? 0,
    price: item.price,
    mileage: item.mileage ?? 0,
    engine: item.engine ?? '',
    drivetrain: item.drivetrain ?? '',
    highlights: item.highlights ?? [],
    heroImage: item.imageUrl ?? '',
  };
}

function AccountFavoritesGridInner({
  isLoggedIn,
  verificationTier,
  initialItems = [],
}: AccountFavoritesGridProps) {
  const [items, setItems] = useState<FavoriteItem[]>(
    () => initialItems.filter((item) => item.category === 'vehicle')
  );
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const favorites = await fetchFavoritesFromServer();
        if (cancelled) return;
        setItems(favorites.filter((item) => item.category === 'vehicle'));
        setError(null);
      } catch {
        if (!cancelled) {
          setError('Unable to load saved vehicles');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const vehicles = items.map(favoriteToInventoryVehicle);
  const showAnonymousBanner = verificationTier === 'anonymous';

  return (
    <div className="space-y-4">
      {showAnonymousBanner ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Verify your phone number to permanently back up favorites to the cloud.{' '}
          <a href="#verify-phone" className="font-semibold underline underline-offset-2">
            Verify phone
          </a>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading saved vehicles…</p>
      ) : vehicles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No saved vehicles yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Heart listings while you browse to collect them here.
          </p>
          <a
            href="/vehicles"
            className="mt-4 inline-flex text-sm font-semibold text-red-600 hover:text-red-700"
          >
            Browse vehicles →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {vehicles.map((vehicle, index) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              position={index + 1}
              buyerContext={{ isLoggedIn, verificationTier }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountFavoritesGrid(props: AccountFavoritesGridProps) {
  const initialSavedIds = (props.initialItems ?? [])
    .filter((item) => item.category === 'vehicle')
    .map((item) => item.id);

  return (
    <FavoritesProvider
      isLoggedIn={props.isLoggedIn}
      verificationTier={props.verificationTier}
      initialSavedIds={initialSavedIds}
    >
      <AccountFavoritesGridInner {...props} />
    </FavoritesProvider>
  );
}
