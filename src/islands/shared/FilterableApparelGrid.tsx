import { useEffect, useMemo, useState } from 'react';
import SearchAndFilterBar from './SearchAndFilterBar';
import {
  APPAREL_STATUS_LABELS,
  APPAREL_STATUS_STYLES,
  type ApparelFilterItem,
} from './apparel-filter-types';

const wholesalePriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

interface FilterableApparelGridProps {
  initialItems: ApparelFilterItem[];
  isSellerView: boolean;
}

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

function matchesSearch(item: ApparelFilterItem, query: string): boolean {
  if (!query) return true;
  const haystack = `${item.title} ${item.brand} ${item.description}`.toLowerCase();
  return haystack.includes(query);
}

function ApparelCardContent({ item, isSellerView }: { item: ApparelFilterItem; isSellerView: boolean }) {
  return (
    <>
      {item.galleryPhotos[0] ? (
        <img
          src={item.galleryPhotos[0]}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-200 text-sm text-slate-500">
          No photo
        </div>
      )}
      <div className="space-y-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.brand}</p>
            <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
          </div>
          {isSellerView && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${APPAREL_STATUS_STYLES[item.status]}`}
            >
              {APPAREL_STATUS_LABELS[item.status]}
            </span>
          )}
        </div>
        <p className="text-lg font-semibold text-slate-900">
          {wholesalePriceFormatter.format(item.price)}
        </p>
      </div>
    </>
  );
}

export default function FilterableApparelGrid({
  initialItems,
  isSellerView,
}: FilterableApparelGridProps) {
  const [items, setItems] = useState(initialItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (selectedIds.size === 0 && isModalOpen) {
      setIsModalOpen(false);
    }
  }, [selectedIds.size, isModalOpen]);

  const brands = useMemo(
    () =>
      [...new Set(items.map((item) => item.brand).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [items]
  );

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesSearch(item, query)) return false;
      if (selectedBrand !== 'All' && item.brand !== selectedBrand) return false;
      if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
      return true;
    });
  }, [items, searchTerm, selectedBrand, selectedStatus]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
        setIsModalOpen(false);
      }
      return !prev;
    });
  };

  const toggleItemSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const keepItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handlePermanentDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setIsDeleting(true);

    try {
      const response = await fetch('/api/seller/apparel/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        deletedCount?: number;
      };

      if (!response.ok) {
        setToast({
          type: 'error',
          message: payload.error ?? 'Failed to delete items. Please try again.',
        });
        return;
      }

      const deletedSet = new Set(ids);
      setItems((prev) => prev.filter((item) => !deletedSet.has(item.id)));
      setIsModalOpen(false);
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      setToast({
        type: 'success',
        message: `Deleted ${payload.deletedCount ?? ids.length} item${(payload.deletedCount ?? ids.length) === 1 ? '' : 's'}.`,
      });
    } catch {
      setToast({
        type: 'error',
        message: 'Failed to delete items. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (items.length === 0) {
    if (!isSellerView) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-700">No listings available yet</p>
          <p className="mt-2 text-sm text-slate-500">Check back soon for new apparel inventory.</p>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-lg font-medium text-slate-700">No catalog items yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Your apparel listings will appear here once added to your catalog.
        </p>
        <a
          href="/seller/apparel/new"
          className="mt-6 inline-flex items-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
        >
          Add Catalog Item
        </a>
        <a
          href="/marketplace/clothing"
          className="mt-4 block text-sm font-semibold text-red-600 hover:text-red-700"
        >
          Browse public apparel marketplace →
        </a>
      </div>
    );
  }

  return (
    <>
      {isSellerView && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isSelectionMode}
              onChange={toggleSelectionMode}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
            />
            Select Items
          </label>
          {isSelectionMode && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              Delete {selectedIds.size} Item{selectedIds.size === 1 ? '' : 's'}
            </button>
          )}
        </div>
      )}

      <SearchAndFilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        brands={brands}
        showStatusFilter={isSellerView}
      />

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-700">No items found matching your criteria</p>
          <p className="mt-2 text-sm text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {filteredItems.map((item) => {
            const href = isSellerView
              ? `/seller/apparel/${item.id}`
              : `/marketplace/clothing/${item.id}`;
            const isSelected = selectedIds.has(item.id);

            if (isSellerView && isSelectionMode) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItemSelection(item.id)}
                  aria-pressed={isSelected}
                  aria-label={isSelected ? `Deselect ${item.title}` : `Select ${item.title}`}
                  className={`block w-full overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-colors ${
                    isSelected
                      ? 'border-red-600 ring-2 ring-red-600'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="relative">
                    <div className="absolute left-3 top-3 z-10">
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 items-center justify-center rounded border bg-white text-xs font-bold ${
                          isSelected ? 'border-red-600 text-red-600' : 'border-slate-300 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </div>
                    <ApparelCardContent item={item} isSellerView={isSellerView} />
                  </div>
                </button>
              );
            }

            return (
              <a
                key={item.id}
                href={href}
                className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:shadow-md"
              >
                <ApparelCardContent item={item} isSellerView={isSellerView} />
              </a>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <>
          {/* Copilot suggestion ignored: aria-describedby is not used elsewhere in this codebase and the dialog title already conveys the action. */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-title"
          >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 id="bulk-delete-title" className="text-lg font-bold text-slate-900">
                Are you sure you want to delete these {selectedIds.size} items?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This action cannot be undone. Remove items you want to keep before confirming.
              </p>
            </div>

            <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto px-6">
              {selectedItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="truncate text-xs text-slate-500">{item.brand}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => keepItem(item.id)}
                    className="shrink-0 text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    Keep
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isDeleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={isDeleting || selectedIds.size === 0}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
        </>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-md px-4 py-3 font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
