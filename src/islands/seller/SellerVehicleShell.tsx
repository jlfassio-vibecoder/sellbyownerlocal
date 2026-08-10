import { useEffect, useState } from 'react';
import type { InquiryRecord, ListingLifecycleStatus, VehicleFormState } from '../../schemas';
import {
  LISTING_STATUS_BADGE_LABELS,
  LISTING_STATUS_BADGE_STYLES,
} from '../../lib/listing-status-ui';
import { updateVehicleStatus } from '../../lib/seller-api';
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
        <ListingStatusMenu
          status={listingStatus}
          disabled={isStatusUpdating}
          badgeLabels={LISTING_STATUS_BADGE_LABELS}
          badgeStyles={LISTING_STATUS_BADGE_STYLES}
          onSelect={handleStatusChange}
        />
      }
    >
      {tabContent}
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
