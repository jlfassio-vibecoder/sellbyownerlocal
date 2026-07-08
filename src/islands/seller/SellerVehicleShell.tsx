import { useState } from 'react';
import type { InquiryRecord, VehicleFormState } from '../../schemas';
import ChatPanel from './ChatPanel';
import SellerLayout, { type SellerTab } from './SellerLayout';
import DetailsEditor from './DetailsEditor';
import InquiriesPanel from './InquiriesPanel';

interface SellerVehicleShellProps {
  vehicleId: string;
  publicListingPath: string;
  vehicleTitle: string;
  vehicleVin?: string;
  hasMonroney?: boolean;
  initialTab?: SellerTab;
  sellerUid: string;
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
  sellerUid,
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
      sellerUid={sellerUid}
    >
      {tabContent}
    </SellerLayout>
  );
}
