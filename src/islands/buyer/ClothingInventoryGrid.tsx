import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClothingListing } from '../../schemas';
import ClothingCard from '../../components/buyer/ClothingCard';
import type { BuyerSaveContext } from '../../components/buyer/VehicleCard';
import SearchAndFilterBar from '../shared/SearchAndFilterBar';
import BuyerMarketplaceShell from './BuyerMarketplaceShell';
import { sortFeaturedFirst } from '../../lib/apparel';

interface ClothingInventoryGridProps {
  initialListings: ClothingListing[];
  storefrontSegmentsBySellerId: Record<string, string>;
  buyerContext?: BuyerSaveContext;
  showFab?: boolean;
  catalogPdfHref?: string;
}

interface ApparelBuyerFilters {
  q: string;
  brand: string;
}

function parseFiltersFromSearch(search: string): ApparelBuyerFilters {
  const params = new URLSearchParams(search);
  const brand = params.get('brand') ?? '';
  return {
    q: params.get('q') ?? '',
    brand: brand === 'All' ? '' : brand,
  };
}

function buildSearchFromFilters(filters: ApparelBuyerFilters): string {
  const params = new URLSearchParams();
  const q = filters.q.trim();
  if (q) params.set('q', q);
  if (filters.brand && filters.brand !== 'All') params.set('brand', filters.brand);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function matchesSearch(listing: ClothingListing, query: string): boolean {
  if (!query) return true;
  const haystack = `${listing.title} ${listing.brand} ${listing.description}`.toLowerCase();
  return haystack.includes(query);
}

function applyFilters(
  listings: ClothingListing[],
  filters: ApparelBuyerFilters
): ClothingListing[] {
  const query = filters.q.trim().toLowerCase();
  const brand = filters.brand && filters.brand !== 'All' ? filters.brand : '';

  return listings.filter((listing) => {
    if (!matchesSearch(listing, query)) return false;
    if (brand && listing.brand !== brand) return false;
    return true;
  });
}

export default function ClothingInventoryGrid({
  initialListings,
  storefrontSegmentsBySellerId,
  buyerContext,
  showFab = true,
  catalogPdfHref,
}: ClothingInventoryGridProps) {
  const [filters, setFilters] = useState<ApparelBuyerFilters>({ q: '', brand: '' });

  const brands = useMemo(
    () =>
      [...new Set(initialListings.map((listing) => listing.brand).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [initialListings]
  );

  const filteredListings = useMemo(
    () => sortFeaturedFirst(applyFilters(initialListings, filters)),
    [initialListings, filters]
  );

  const isFiltered = Boolean(filters.q.trim() || (filters.brand && filters.brand !== 'All'));

  const updateFilters = useCallback((next: ApparelBuyerFilters) => {
    setFilters(next);
    const search = buildSearchFromFilters(next);
    window.history.pushState(null, '', `${window.location.pathname}${search}`);
  }, []);

  useEffect(() => {
    setFilters(parseFiltersFromSearch(window.location.search));

    const handlePopState = () => {
      setFilters(parseFiltersFromSearch(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <BuyerMarketplaceShell
      isLoggedIn={buyerContext?.isLoggedIn ?? false}
      verificationTier={buyerContext?.verificationTier ?? 'anonymous'}
      showFab={showFab}
    >
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {catalogPdfHref ? (
          <div className="mb-4">
            <a
              href={catalogPdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              Download Catalog (PDF)
            </a>
          </div>
        ) : null}
        <SearchAndFilterBar
          searchTerm={filters.q}
          setSearchTerm={(q) => updateFilters({ ...filters, q })}
          selectedBrand={filters.brand || 'All'}
          setSelectedBrand={(brand) =>
            updateFilters({ ...filters, brand: brand === 'All' ? '' : brand })
          }
          selectedStatus="All"
          setSelectedStatus={() => {}}
          brands={brands}
          showStatusFilter={false}
        />

        <p className="mb-6 text-sm text-slate-500">
          {isFiltered
            ? `${filteredListings.length} of ${initialListings.length} item${
                initialListings.length === 1 ? '' : 's'
              }`
            : `${filteredListings.length} item${filteredListings.length === 1 ? '' : 's'}`}
        </p>

        {filteredListings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-lg font-medium text-slate-700">
              No items found matching your criteria
            </p>
            <p className="mt-2 text-sm text-slate-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {filteredListings.map((listing) => (
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
        )}
      </main>
    </BuyerMarketplaceShell>
  );
}
