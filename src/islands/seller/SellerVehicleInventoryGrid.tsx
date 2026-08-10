import { useEffect, useMemo, useState } from 'react';
import ListingStatusMenu from './ListingStatusMenu';
import {
  LISTING_STATUS_BADGE_LABELS,
  LISTING_STATUS_BADGE_STYLES,
  LISTING_STATUS_FILTER_CHIPS,
} from '../../lib/listing-status-ui';
import { hardDeleteVehicle, updateVehicleStatus } from '../../lib/seller-api';
import type { ListingLifecycleStatus } from '../../schemas';

export interface SellerVehicleInventoryItem {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  city: string;
  status: ListingLifecycleStatus;
  imageUrl?: string;
  inventorySource?: 'native' | 'dealer_comp';
}

interface SellerVehicleInventoryGridProps {
  initialVehicles: SellerVehicleInventoryItem[];
}

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function statusChipClass(isActive: boolean): string {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-slate-900 text-white'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;
}

export default function SellerVehicleInventoryGrid({
  initialVehicles,
}: SellerVehicleInventoryGridProps) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    setVehicles(initialVehicles);
  }, [initialVehicles]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredVehicles = useMemo(() => {
    if (selectedStatus === 'All') return vehicles;
    return vehicles.filter((vehicle) => vehicle.status === selectedStatus);
  }, [vehicles, selectedStatus]);

  const confirmVehicle = confirmDeleteId
    ? vehicles.find((vehicle) => vehicle.id === confirmDeleteId)
    : null;

  const handleStatusChange = async (id: string, next: ListingLifecycleStatus) => {
    const previous = vehicles.find((vehicle) => vehicle.id === id);
    if (!previous || previous.status === next) return;

    setStatusUpdatingId(id);
    setVehicles((prev) =>
      prev.map((vehicle) => (vehicle.id === id ? { ...vehicle, status: next } : vehicle))
    );

    try {
      await updateVehicleStatus(id, next);
      setToast({
        type: 'success',
        message: `Status updated to ${LISTING_STATUS_BADGE_LABELS[next]}.`,
      });
    } catch (error) {
      setVehicles((prev) =>
        prev.map((vehicle) =>
          vehicle.id === id ? { ...vehicle, status: previous.status } : vehicle
        )
      );
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update status.',
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDeleteId || !confirmVehicle || confirmVehicle.status !== 'archived') return;

    setDeletingId(confirmDeleteId);
    try {
      await hardDeleteVehicle(confirmDeleteId);
      setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      setToast({
        type: 'success',
        message: 'Listing permanently deleted.',
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete listing.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (vehicles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-lg font-medium text-slate-700">No listings yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Create your first listing or link existing vehicles to your account.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/seller/new"
            className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            Create New Listing
          </a>
          <a
            href="/vehicles"
            className="text-sm font-semibold text-red-600 hover:text-red-700"
          >
            Browse public listings →
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {LISTING_STATUS_FILTER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            role="tab"
            aria-selected={selectedStatus === chip.value}
            onClick={() => setSelectedStatus(chip.value)}
            className={statusChipClass(selectedStatus === chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-700">No vehicles match this status</p>
          <p className="mt-2 text-sm text-slate-500">Try another filter chip.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:shadow-md"
            >
              <a href={`/seller/vehicles/${vehicle.id}`} className="block">
                {vehicle.imageUrl ? (
                  <img
                    src={vehicle.imageUrl}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    width={400}
                    height={300}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-200 text-sm text-slate-500">
                    No photo
                  </div>
                )}
              </a>
              <div className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={`/seller/vehicles/${vehicle.id}`}
                    className="min-w-0 text-lg font-bold text-slate-900 hover:text-red-700"
                  >
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </a>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {vehicle.inventorySource === 'dealer_comp' && (
                      <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-white">
                        Dealer Comp
                      </span>
                    )}
                    <ListingStatusMenu
                      status={vehicle.status}
                      disabled={
                        statusUpdatingId === vehicle.id || deletingId === vehicle.id
                      }
                      badgeLabels={LISTING_STATUS_BADGE_LABELS}
                      badgeStyles={LISTING_STATUS_BADGE_STYLES}
                      onSelect={(next) => handleStatusChange(vehicle.id, next)}
                    />
                  </div>
                </div>
                <p className="text-lg font-semibold text-slate-900">
                  {priceFormatter.format(vehicle.price)}
                </p>
                <p className="text-sm text-slate-500">{vehicle.city}</p>
                {vehicle.status === 'archived' && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(vehicle.id)}
                    disabled={deletingId === vehicle.id}
                    className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Permanently Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmVehicle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vehicle-hard-delete-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 id="vehicle-hard-delete-title" className="text-lg font-bold text-slate-900">
                Permanently delete this listing?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {confirmVehicle.year} {confirmVehicle.make} {confirmVehicle.model} will be
                removed. Buyer favorites are cleaned up; leads and analytics are kept. This
                cannot be undone.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-3 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId !== null}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={deletingId !== null}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
