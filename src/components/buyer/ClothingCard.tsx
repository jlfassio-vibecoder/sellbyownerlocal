import type { ClothingListing } from '../../schemas';
import type { BuyerSaveContext } from './VehicleCard';
import FavoriteButton from '../../islands/buyer/FavoriteButton';
import { priceFormatter } from '../../utils/formatters';
import { getClothingListingPath } from '../../utils/url-helpers';

interface ClothingCardProps {
  listing: ClothingListing;
  storefrontSegment: string;
  buyerContext?: BuyerSaveContext;
}

function hasSalePricing(listing: ClothingListing): boolean {
  return Boolean(
    listing.isSale &&
      typeof listing.salePrice === 'number' &&
      listing.salePrice < listing.price
  );
}

export default function ClothingCard({
  listing,
  storefrontSegment,
  buyerContext,
}: ClothingCardProps) {
  const listingPath = getClothingListingPath(listing.id, storefrontSegment);
  const showFeatured = Boolean(listing.isFeatured);
  // Copilot suggestion ignored: Sale badge uses isSale so bulk “Mark as Sale” remains visible before a salePrice is set; dual pricing still uses hasSalePricing.
  const showSale = Boolean(listing.isSale);
  const onSale = hasSalePricing(listing);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative">
        <a href={listingPath} className="block">
          {listing.galleryPhotos[0] ? (
            <div className="aspect-[4/3] w-full bg-slate-100">
              <img
                src={listing.galleryPhotos[0]}
                alt={listing.title}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
              No photo
            </div>
          )}
        </a>
        {(showFeatured || showSale) && (
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
            {showFeatured && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                Featured
              </span>
            )}
            {showSale && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                Sale
              </span>
            )}
          </div>
        )}
        {onSale && (
          <div className="absolute bottom-3 left-3 z-10 flex items-baseline gap-2 rounded-md bg-white/95 px-2.5 py-1.5 shadow-sm">
            <span className="text-sm font-semibold text-red-600 line-through">
              {priceFormatter.format(listing.price)}
            </span>
            <span className="text-base font-bold text-emerald-600">
              {priceFormatter.format(listing.salePrice!)}
            </span>
          </div>
        )}
        <div
          className="absolute top-3 right-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <FavoriteButton
            itemId={listing.id}
            title={listing.title}
            price={onSale ? listing.salePrice! : listing.price}
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
        {onSale ? (
          <p className="flex items-baseline gap-2 text-xl font-bold">
            <span className="text-red-600 line-through">
              {priceFormatter.format(listing.price)}
            </span>
            <span className="text-emerald-600">{priceFormatter.format(listing.salePrice!)}</span>
          </p>
        ) : (
          <p className="text-xl font-bold text-slate-900">
            {priceFormatter.format(listing.price)}
          </p>
        )}
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
