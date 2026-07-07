import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InventoryVehicle } from '../../types/inventory-vehicle';
import VehicleCard from '../../components/buyer/VehicleCard';

interface InventoryGridProps {
  initialVehicles: InventoryVehicle[];
}

interface InventoryFilters {
  make: string;
  model: string;
  minPrice: string;
  maxPrice: string;
  minMileage: string;
  maxMileage: string;
  minYear: string;
  maxYear: string;
}

function parseFiltersFromSearch(search: string): InventoryFilters {
  const params = new URLSearchParams(search);
  return {
    make: params.get('make') ?? '',
    model: params.get('model') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    minMileage: params.get('minMileage') ?? '',
    maxMileage: params.get('maxMileage') ?? '',
    minYear: params.get('minYear') ?? '',
    maxYear: params.get('maxYear') ?? '',
  };
}

function buildSearchFromFilters(filters: InventoryFilters): string {
  const params = new URLSearchParams();
  if (filters.make) params.set('make', filters.make);
  if (filters.model) params.set('model', filters.model);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.minMileage) params.set('minMileage', filters.minMileage);
  if (filters.maxMileage) params.set('maxMileage', filters.maxMileage);
  if (filters.minYear) params.set('minYear', filters.minYear);
  if (filters.maxYear) params.set('maxYear', filters.maxYear);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function normalizeRange(min?: number, max?: number): { min?: number; max?: number } {
  if (min !== undefined && max !== undefined && min > max) {
    return { min: max, max: min };
  }
  return { min, max };
}

function applyFilters(vehicles: InventoryVehicle[], filters: InventoryFilters): InventoryVehicle[] {
  const minPrice = filters.minPrice ? Number(filters.minPrice) : undefined;
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : undefined;
  const minMileage = filters.minMileage ? Number(filters.minMileage) : undefined;
  const maxMileage = filters.maxMileage ? Number(filters.maxMileage) : undefined;
  const minYear = filters.minYear ? Number(filters.minYear) : undefined;
  const maxYear = filters.maxYear ? Number(filters.maxYear) : undefined;

  const priceRange = normalizeRange(
    minPrice !== undefined && !Number.isNaN(minPrice) ? minPrice : undefined,
    maxPrice !== undefined && !Number.isNaN(maxPrice) ? maxPrice : undefined
  );
  const mileageRange = normalizeRange(
    minMileage !== undefined && !Number.isNaN(minMileage) ? minMileage : undefined,
    maxMileage !== undefined && !Number.isNaN(maxMileage) ? maxMileage : undefined
  );
  const yearRange = normalizeRange(
    minYear !== undefined && !Number.isNaN(minYear) ? minYear : undefined,
    maxYear !== undefined && !Number.isNaN(maxYear) ? maxYear : undefined
  );

  const modelFilter = filters.model.trim().toLowerCase();

  return vehicles.filter((vehicle) => {
    if (filters.make && vehicle.make !== filters.make) return false;
    if (modelFilter && vehicle.model.toLowerCase() !== modelFilter) return false;
    if (priceRange.min !== undefined && vehicle.price < priceRange.min) return false;
    if (priceRange.max !== undefined && vehicle.price > priceRange.max) return false;
    if (mileageRange.min !== undefined && vehicle.mileage < mileageRange.min) return false;
    if (mileageRange.max !== undefined && vehicle.mileage > mileageRange.max) return false;
    if (yearRange.min !== undefined && vehicle.year < yearRange.min) return false;
    if (yearRange.max !== undefined && vehicle.year > yearRange.max) return false;
    return true;
  });
}

const inputClassName =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export default function InventoryGrid({ initialVehicles }: InventoryGridProps) {
  const [filters, setFilters] = useState<InventoryFilters>({
    make: '',
    model: '',
    minPrice: '',
    maxPrice: '',
    minMileage: '',
    maxMileage: '',
    minYear: '',
    maxYear: '',
  });

  const makes = useMemo(
    () => [...new Set(initialVehicles.map((v) => v.make))].sort(),
    [initialVehicles]
  );

  const availableModels = useMemo(() => {
    if (!filters.make) return [];
    return [
      ...new Set(
        initialVehicles.filter((v) => v.make === filters.make).map((v) => v.model)
      ),
    ].sort();
  }, [initialVehicles, filters.make]);

  const filteredVehicles = useMemo(
    () => applyFilters(initialVehicles, filters),
    [initialVehicles, filters]
  );

  const updateFilters = useCallback((next: InventoryFilters) => {
    setFilters(next);
    const search = buildSearchFromFilters(next);
    // Copilot suggestion ignored: pushState is intentional so browser Back restores prior filter state.
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
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
      <aside className="w-full shrink-0 lg:w-64">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Filters</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block space-y-1">
              <span className="text-sm text-slate-600">Make</span>
              <select
                value={filters.make}
                onChange={(e) =>
                  updateFilters({ ...filters, make: e.target.value, model: '' })
                }
                className={inputClassName}
              >
                <option value="">All makes</option>
                {makes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-slate-600">Model</span>
              <select
                value={filters.model}
                disabled={!filters.make}
                onChange={(e) => updateFilters({ ...filters, model: e.target.value })}
                className={inputClassName}
              >
                <option value="">All models</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-1">
            <span className="text-sm text-slate-600">Year range</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1900}
                placeholder="Min year"
                value={filters.minYear}
                onChange={(e) => updateFilters({ ...filters, minYear: e.target.value })}
                className={inputClassName}
              />
              <input
                type="number"
                min={1900}
                placeholder="Max year"
                value={filters.maxYear}
                onChange={(e) => updateFilters({ ...filters, maxYear: e.target.value })}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-sm text-slate-600">Price range</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min $"
                value={filters.minPrice}
                onChange={(e) => updateFilters({ ...filters, minPrice: e.target.value })}
                className={inputClassName}
              />
              <input
                type="number"
                min={0}
                placeholder="Max $"
                value={filters.maxPrice}
                onChange={(e) => updateFilters({ ...filters, maxPrice: e.target.value })}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-sm text-slate-600">Mileage range</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min mi"
                value={filters.minMileage}
                onChange={(e) => updateFilters({ ...filters, minMileage: e.target.value })}
                className={inputClassName}
              />
              <input
                type="number"
                min={0}
                placeholder="Max mi"
                value={filters.maxMileage}
                onChange={(e) => updateFilters({ ...filters, maxMileage: e.target.value })}
                className={inputClassName}
              />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <p className="mb-4 text-sm text-slate-500">
          {filteredVehicles.length} vehicle{filteredVehicles.length === 1 ? '' : 's'}
        </p>

        {filteredVehicles.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-lg font-medium text-slate-700">No vehicles match your filters</p>
            <p className="mt-2 text-sm text-slate-500">Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
