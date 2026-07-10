import type { ClothingListing } from '../../schemas';
import ClothingCard from '../../components/buyer/ClothingCard';
import type { BuyerSaveContext } from '../../components/buyer/VehicleCard';

interface ClothingInventoryGridProps {
  initialListings: ClothingListing[];
  buyerContext?: BuyerSaveContext;
}

export default function ClothingInventoryGrid({
  initialListings,
  buyerContext,
}: ClothingInventoryGridProps) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="mb-6 text-sm text-slate-500">
        {initialListings.length} item{initialListings.length === 1 ? '' : 's'}
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {initialListings.map((listing) => (
          <ClothingCard key={listing.id} listing={listing} buyerContext={buyerContext} />
        ))}
      </div>
    </main>
  );
}
