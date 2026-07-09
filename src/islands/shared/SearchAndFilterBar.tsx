import type { ApparelFilterStatus } from '../../lib/apparel';

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-red-600 focus:ring-2 focus:ring-red-600';

const STATUS_OPTIONS: { value: ApparelFilterStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

interface SearchAndFilterBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedBrand: string;
  setSelectedBrand: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  brands: string[];
  showStatusFilter: boolean;
}

export default function SearchAndFilterBar({
  searchTerm,
  setSearchTerm,
  selectedBrand,
  setSelectedBrand,
  selectedStatus,
  setSelectedStatus,
  brands,
  showStatusFilter,
}: SearchAndFilterBarProps) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={showStatusFilter ? 'sm:col-span-2 lg:col-span-1' : 'sm:col-span-2'}>
          <label htmlFor="apparel-search" className="mb-1 block text-sm font-medium text-slate-700">
            Search
          </label>
          <input
            id="apparel-search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Title, brand, or style code…"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="apparel-brand" className="mb-1 block text-sm font-medium text-slate-700">
            Brand
          </label>
          <select
            id="apparel-brand"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="All">All brands</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        {showStatusFilter && (
          <div>
            <label htmlFor="apparel-status" className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="apparel-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="All">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </section>
  );
}
