import { Copy, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import SearchAndFilterBar from './SearchAndFilterBar';
import ApparelListingImage from '../../components/apparel/ApparelListingImage';
import {
  APPAREL_SELLER_STATUS_LABELS,
  APPAREL_STATUS_STYLES,
  type ApparelBulkUpdate,
  type ApparelFilterItem,
  type ApparelItemUpdate,
  buildTitleWithItemCode,
  joinCommaList,
  parseItemCodeFromTitle,
  splitCommaList,
} from '../../lib/apparel';
import { getClothingListingPath } from '../../utils/url-helpers';

const wholesalePriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const BULK_ACTION_OPTIONS: { value: string; label: string; updates: ApparelBulkUpdate; successLabel: string }[] = [
  { value: 'make-public', label: 'Make Public', updates: { status: 'active' }, successLabel: 'made public' },
  { value: 'hide-draft', label: 'Hide to Draft', updates: { status: 'draft' }, successLabel: 'moved to draft' },
  { value: 'mark-featured', label: 'Mark as Featured', updates: { isFeatured: true }, successLabel: 'marked as featured' },
  { value: 'remove-featured', label: 'Remove Featured', updates: { isFeatured: false }, successLabel: 'removed from featured' },
  { value: 'mark-sale', label: 'Mark as Sale', updates: { isSale: true }, successLabel: 'marked as sale' },
  { value: 'remove-sale', label: 'Remove Sale', updates: { isSale: false }, successLabel: 'removed from sale' },
];

interface FilterableApparelGridProps {
  initialItems: ApparelFilterItem[];
  isSellerView: boolean;
  /** Canonical storefront segment for public listing URLs (slug or seller UID). */
  storefrontSegment: string;
}

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

type EditFormState = {
  title: string;
  brand: string;
  price: string;
  description: string;
  itemCode: string;
  sizesCsv: string;
  colorsCsv: string;
  published: boolean;
  isFeatured: boolean;
  isSale: boolean;
};

const EMPTY_EDIT_FORM: EditFormState = {
  title: '',
  brand: '',
  price: '',
  description: '',
  itemCode: '',
  sizesCsv: '',
  colorsCsv: '',
  published: false,
  isFeatured: false,
  isSale: false,
};

function matchesSearch(item: ApparelFilterItem, query: string): boolean {
  if (!query) return true;
  const haystack = `${item.title} ${item.brand} ${item.description}`.toLowerCase();
  return haystack.includes(query);
}

function ApparelCardContent({ item, isSellerView }: { item: ApparelFilterItem; isSellerView: boolean }) {
  const showFeatured = Boolean(item.isFeatured);
  const showSale = Boolean(item.isSale);

  return (
    <>
      <div className="relative">
        <ApparelListingImage title={item.title} imageUrl={item.galleryPhotos[0]} />
        {(showFeatured || showSale) && (
          <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
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
      </div>
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
              {APPAREL_SELLER_STATUS_LABELS[item.status]}
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
  storefrontSegment,
}: FilterableApparelGridProps) {
  const [items, setItems] = useState(initialItems);
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editingItem, setEditingItem] = useState<ApparelFilterItem | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (!editingItem) {
      setEditForm(EMPTY_EDIT_FORM);
      return;
    }

    const { itemCode, titleWithoutCode } = parseItemCodeFromTitle(editingItem.title);
    setEditForm({
      title: titleWithoutCode,
      brand: editingItem.brand,
      price: String(editingItem.price),
      description: editingItem.description,
      itemCode,
      sizesCsv: joinCommaList(editingItem.sizes),
      colorsCsv: joinCommaList(editingItem.colors),
      published: editingItem.status === 'active',
      isFeatured: Boolean(editingItem.isFeatured),
      isSale: Boolean(editingItem.isSale),
    });
  }, [editingItem]);

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

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setIsModalOpen(false);
  };

  const enterSelectionMode = () => {
    setIsSelectionMode(true);
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredItems.map((item) => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsModalOpen(false);
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

  const handleBulkUpdate = async (updates: ApparelBulkUpdate, successLabel: string) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setIsBulkUpdating(true);

    try {
      const response = await fetch('/api/seller/apparel/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        updatedCount?: number;
      };

      if (!response.ok) {
        setToast({
          type: 'error',
          message: payload.error ?? 'Failed to update items. Please try again.',
        });
        return;
      }

      const updatedSet = new Set(ids);
      const query = searchTerm.trim().toLowerCase();
      const nextItems = items.map((item) =>
        updatedSet.has(item.id) ? { ...item, ...updates } : item
      );
      const stillVisibleIds = new Set(
        nextItems
          .filter((item) => {
            if (!matchesSearch(item, query)) return false;
            if (selectedBrand !== 'All' && item.brand !== selectedBrand) return false;
            if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
            return true;
          })
          .map((item) => item.id)
      );
      setItems(nextItems);
      // Drop selection for items that leave the current filtered view (e.g. Make Public while
      // filtering Drafts), but keep visible selections so sellers can chain actions.
      setSelectedIds((prevSelected) => {
        const nextSelected = new Set<string>();
        for (const id of prevSelected) {
          if (stillVisibleIds.has(id)) nextSelected.add(id);
        }
        return nextSelected;
      });
      setToast({
        type: 'success',
        message: `${payload.updatedCount ?? ids.length} item${(payload.updatedCount ?? ids.length) === 1 ? '' : 's'} ${successLabel}.`,
      });
    } catch {
      setToast({
        type: 'error',
        message: 'Failed to update items. Please try again.',
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleCopyLink = async (id: string) => {
    const url = `${window.location.origin}${getClothingListingPath(id, storefrontSegment)}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({
        type: 'success',
        message: 'Public link copied to clipboard!',
      });
    } catch {
      setToast({
        type: 'error',
        message: 'Failed to copy link. Please try again.',
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const trimmedTitle = editForm.title.trim();
    const trimmedBrand = editForm.brand.trim();
    const trimmedDescription = editForm.description.trim();

    if (!trimmedTitle || !trimmedBrand || !trimmedDescription) {
      setToast({
        type: 'error',
        message: 'Title, brand, and description are required.',
      });
      return;
    }

    const price = Number(editForm.price);
    if (!Number.isFinite(price) || price < 0) {
      setToast({
        type: 'error',
        message: 'Enter a valid price.',
      });
      return;
    }

    const updates: ApparelItemUpdate = {
      title: buildTitleWithItemCode(trimmedTitle, editForm.itemCode),
      brand: trimmedBrand,
      price,
      description: trimmedDescription,
      sizes: splitCommaList(editForm.sizesCsv),
      colors: splitCommaList(editForm.colorsCsv),
      status: editForm.published ? 'active' : 'draft',
      isFeatured: editForm.isFeatured,
      isSale: editForm.isSale,
    };

    setIsSaving(true);

    try {
      const response = await fetch('/api/seller/apparel/update-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingItem.id, updates }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setToast({
          type: 'error',
          message: payload.error ?? 'Failed to update item. Please try again.',
        });
        return;
      }

      setItems((prev) =>
        prev.map((item) => (item.id === editingItem.id ? { ...item, ...updates } : item))
      );
      setEditingItem(null);
      setToast({
        type: 'success',
        message: 'Listing updated.',
      });
    } catch {
      setToast({
        type: 'error',
        message: 'Failed to update item. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
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
        <div className="mb-4">
          {!isSelectionMode ? (
            <button
              type="button"
              onClick={enterSelectionMode}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Select multiple
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Selecting items</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Tap items to select them, then choose an action below.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    disabled={filteredItems.length === 0 || isBulkUpdating || isDeleting}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    Select all
                  </button>
                  {selectedIds.size > 0 ? (
                    <button
                      type="button"
                      onClick={clearSelection}
                      disabled={isBulkUpdating || isDeleting}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={exitSelectionMode}
                    disabled={isBulkUpdating || isDeleting}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
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
        <div
          className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${
            isSellerView && isSelectionMode ? 'pb-36' : ''
          }`}
        >
          {filteredItems.map((item) => {
            const href = isSellerView
              ? `/seller/apparel/${item.id}`
              : getClothingListingPath(item.id, storefrontSegment);
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

            if (isSellerView) {
              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:shadow-md"
                >
                  <div className="relative">
                    <a href={href} className="block">
                      <ApparelCardContent item={item} isSellerView={isSellerView} />
                    </a>
                    <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-white"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      {item.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleCopyLink(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-white"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          Copy Link
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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

      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-item-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 id="edit-item-title" className="text-lg font-bold text-slate-900">
                Edit Listing
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Update catalog details without leaving the dashboard.
              </p>
            </div>

            <div className="space-y-4 px-6 py-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Title</span>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  disabled={isSaving}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Brand</span>
                <input
                  type="text"
                  value={editForm.brand}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, brand: e.target.value }))}
                  disabled={isSaving}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                  disabled={isSaving}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  disabled={isSaving}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Item Code</span>
                <input
                  type="text"
                  value={editForm.itemCode}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, itemCode: e.target.value }))}
                  disabled={isSaving}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Sizes</span>
                <input
                  type="text"
                  value={editForm.sizesCsv}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, sizesCsv: e.target.value }))}
                  disabled={isSaving}
                  placeholder="S, M, L, XL"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Colors</span>
                <input
                  type="text"
                  value={editForm.colorsCsv}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, colorsCsv: e.target.value }))}
                  disabled={isSaving}
                  placeholder="Black, Navy, White"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>

              <div className="space-y-3 border-t border-slate-200 pt-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.published}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, published: e.target.checked }))}
                    disabled={isSaving}
                    className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.isFeatured}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                    disabled={isSaving}
                    className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
                  />
                  Mark as Featured
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.isSale}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, isSale: e.target.checked }))}
                    disabled={isSaving}
                    className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
                  />
                  Mark as on Sale
                </label>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                disabled={isSaving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSellerView && isSelectionMode && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : 'Select items below'}
              </p>
              <button
                type="button"
                onClick={exitSelectionMode}
                disabled={isBulkUpdating || isDeleting}
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 disabled:opacity-50"
              >
                Done
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {BULK_ACTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleBulkUpdate(option.updates, option.successLabel)}
                  disabled={selectedIds.size === 0 || isBulkUpdating || isDeleting}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBulkUpdating ? 'Working…' : option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                disabled={selectedIds.size === 0 || isBulkUpdating || isDeleting}
                className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
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
          className={`fixed right-4 z-50 max-w-sm rounded-md px-4 py-3 font-medium text-white shadow-lg ${
            isSellerView && isSelectionMode ? 'bottom-28' : 'bottom-4'
          } ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
