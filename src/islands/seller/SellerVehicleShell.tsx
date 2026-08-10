import { useEffect, useState } from 'react';
import type { InquiryRecord, ListingLifecycleStatus, VehicleFormState } from '../../schemas';
import {
  LISTING_STATUS_BADGE_LABELS,
  LISTING_STATUS_BADGE_STYLES,
} from '../../lib/listing-status-ui';
import { hardDeleteVehicle, updateVehicleStatus } from '../../lib/seller-api';
import ChatPanel from './ChatPanel';
import SellerLayout, { type SellerTab } from './SellerLayout';
import DetailsEditor from './DetailsEditor';
import InquiriesPanel from './InquiriesPanel';
import InsightsPanel from './InsightsPanel';
import ListingStatusMenu from './ListingStatusMenu';
import SellerFabSettingsPanel from './SellerFabSettingsPanel';

interface SellerVehicleShellProps {
  vehicleId: string;
  sellerId: string;
  initialHideFab?: boolean;
  publicListingPath: string;
  vehicleTitle: string;
  vehicleVin?: string;
  hasMonroney?: boolean;
  initialTab?: SellerTab;
  initialInquiries: InquiryRecord[];
  initialFormState: VehicleFormState;
  initialStatus: ListingLifecycleStatus;
}

export default function SellerVehicleShell({
  vehicleId,
  sellerId,
  initialHideFab = false,
  publicListingPath,
  vehicleTitle,
  vehicleVin,
  hasMonroney: initialHasMonroney = false,
  initialTab = 'messages',
  initialInquiries,
  initialFormState,
  initialStatus,
}: SellerVehicleShellProps) {
  const [activeTab, setActiveTab] = useState<SellerTab>(initialTab);
  const [formState, setFormState] = useState(initialFormState);
  const [hasMonroney, setHasMonroney] = useState(initialHasMonroney);
  const [listingStatus, setListingStatus] = useState(initialStatus);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleStatusChange = async (next: ListingLifecycleStatus) => {
    if (next === listingStatus) return;
    const previous = listingStatus;
    setIsStatusUpdating(true);
    setListingStatus(next);
    try {
      await updateVehicleStatus(vehicleId, next);
      setToast({
        type: 'success',
        message: `Status updated to ${LISTING_STATUS_BADGE_LABELS[next]}.`,
      });
    } catch (error) {
      setListingStatus(previous);
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update status.',
      });
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (listingStatus !== 'archived') return;
    setIsDeleting(true);
    try {
      await hardDeleteVehicle(vehicleId);
      window.location.href = '/seller/vehicles';
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete listing.',
      });
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  const tabContent =
    activeTab === 'messages' ? (
      <ChatPanel vehicleId={vehicleId} vehicleTitle={vehicleTitle} />
    ) : activeTab === 'inquiries' ? (
      <InquiriesPanel inquiries={initialInquiries} />
    ) : activeTab === 'insights' ? (
      <InsightsPanel vehicleId={vehicleId} />
    ) : (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="shrink-0 border-b border-slate-200 bg-[#f8f9fa] px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SellerFabSettingsPanel userId={sellerId} initialHideFab={initialHideFab} />
          </div>
        </div>
        <DetailsEditor
          vehicleId={vehicleId}
          publicListingPath={publicListingPath}
          vehicleVin={vehicleVin}
          hasMonroney={hasMonroney}
          onMonroneyUpdated={() => setHasMonroney(true)}
          formState={formState}
          onChange={setFormState}
        />
      </div>
    );

  return (
    <SellerLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      inquiryCount={initialInquiries.length}
      vehicleTitle={vehicleTitle}
      statusControl={
        <div className="flex flex-wrap items-center gap-3">
          <ListingStatusMenu
            status={listingStatus}
            disabled={isStatusUpdating || isDeleting}
            badgeLabels={LISTING_STATUS_BADGE_LABELS}
            badgeStyles={LISTING_STATUS_BADGE_STYLES}
            onSelect={handleStatusChange}
          />
          {listingStatus === 'archived' && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isDeleting}
              className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Permanently Delete
            </button>
          )}
        </div>
      }
    >
      {tabContent}
      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shell-hard-delete-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 id="shell-hard-delete-title" className="text-lg font-bold text-slate-900">
                Permanently delete this listing?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {vehicleTitle} will be removed. Buyer favorites are cleaned up; leads and
                analytics are kept. This cannot be undone.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-3 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={isDeleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Permanently Delete'}
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
    </SellerLayout>
  );
}
