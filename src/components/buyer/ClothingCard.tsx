import type { ClothingListing } from '../../schemas';
import type { BuyerSaveContext } from './VehicleCard';
import FavoriteButton from '../../islands/buyer/FavoriteButton';
import { priceFormatter } from '../../utils/formatters';

interface ClothingCardProps {
  listing: ClothingListing;
  buyerContext?: BuyerSaveContext;
}

export default function ClothingCard({ listing, buyerContext }: ClothingCardProps) {
  const listingPath = `/marketplace/clothing/${listing.id}`;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative">
        <a href={listingPath} className="block">
          {listing.galleryPhotos[0] ? (
            <img
              src={listing.galleryPhotos[0]}
              alt={listing.title}
              className="aspect-[4/5] w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
              No photo
            </div>
          )}
        </a>
        <div
          className="absolute top-3 right-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <FavoriteButton
            itemId={listing.id}
            title={listing.title}
            price={listing.price}
            category="clothing"
            sellerId={listing.sellerId}
            isLoggedIn={buyerContext?.isLoggedIn ?? false}
            verificationTier={buyerContext?.verificationTier ?? 'anonymous'}
          />
        </div>
      </div>

      <a href={listingPath} className="block space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {listing.brand}
        </p>
        <h2 className="text-xl font-bold text-slate-900">{listing.title}</h2>
        <p className="text-xl font-bold text-slate-900">{priceFormatter.format(listing.price)}</p>
        {listing.sizes.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {listing.sizes.map((size) => (
              <li
                key={size}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
              >
                {size}
              </li>
            ))}
          </ul>
        )}
      </a>
    </div>
  );
}
