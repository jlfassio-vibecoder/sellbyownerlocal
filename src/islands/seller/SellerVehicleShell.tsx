import { useState } from 'react';
import type { InquiryRecord, VehicleFormState } from '../../schemas';
import ChatPanel from './ChatPanel';
import SellerLayout, { type SellerTab } from './SellerLayout';
import DetailsEditor from './DetailsEditor';
import InquiriesPanel from './InquiriesPanel';
import InsightsPanel from './InsightsPanel';

interface SellerVehicleShellProps {
  vehicleId: string;
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
      <DetailsEditor
        vehicleId={vehicleId}
        publicListingPath={publicListingPath}
        vehicleVin={vehicleVin}
        hasMonroney={hasMonroney}
        onMonroneyUpdated={() => setHasMonroney(true)}
        formState={formState}
        onChange={setFormState}
      />
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
