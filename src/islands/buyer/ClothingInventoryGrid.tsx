import type { ClothingListing } from '../../schemas';
import ClothingCard from '../../components/buyer/ClothingCard';
import type { BuyerSaveContext } from '../../components/buyer/VehicleCard';
import BuyerMarketplaceShell from './BuyerMarketplaceShell';

interface ClothingInventoryGridProps {
  initialListings: ClothingListing[];
  storefrontSegmentsBySellerId: Record<string, string>;
  buyerContext?: BuyerSaveContext;
  showFab?: boolean;
}

export default function ClothingInventoryGrid({
  initialListings,
  storefrontSegmentsBySellerId,
  buyerContext,
  showFab = true,
}: ClothingInventoryGridProps) {
  return (
    <BuyerMarketplaceShell
      isLoggedIn={buyerContext?.isLoggedIn ?? false}
      verificationTier={buyerContext?.verificationTier ?? 'anonymous'}
      showFab={showFab}
    >
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="mb-6 text-sm text-slate-500">
          {initialListings.length} item{initialListings.length === 1 ? '' : 's'}
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {initialListings.map((listing) => (
            <ClothingCard
              key={listing.id}
              listing={listing}
              storefrontSegment={
                storefrontSegmentsBySellerId[listing.sellerId] ?? listing.sellerId
              }
              buyerContext={buyerContext}
            />
          ))}
        </div>
      </main>
    </BuyerMarketplaceShell>
  );
}
