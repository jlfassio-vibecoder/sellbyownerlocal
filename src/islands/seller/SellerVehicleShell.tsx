import { useState } from 'react';
import type { InquiryRecord, VehicleFormState } from '../../schemas';
import ChatPanel from './ChatPanel';
import SellerLayout, { type SellerTab } from './SellerLayout';
import DetailsEditor from './DetailsEditor';
import InquiriesPanel from './InquiriesPanel';
import InsightsPanel from './InsightsPanel';
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
}: SellerVehicleShellProps) {
  const [activeTab, setActiveTab] = useState<SellerTab>(initialTab);
  const [formState, setFormState] = useState(initialFormState);
  const [hasMonroney, setHasMonroney] = useState(initialHasMonroney);

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
    >
      {tabContent}
    </SellerLayout>
  );
}
