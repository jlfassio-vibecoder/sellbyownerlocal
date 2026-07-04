import { useState } from 'react';
import type { InquiryRecord, VehicleFormState } from '../../schemas';
import ChatPanel from './ChatPanel';
import SellerLayout, { type SellerTab } from './SellerLayout';
import DetailsEditor from './DetailsEditor';
import InquiriesPanel from './InquiriesPanel';

interface SellerVehicleShellProps {
  vehicleId: string;
  vehicleTitle: string;
  initialInquiries: InquiryRecord[];
  initialFormState: VehicleFormState;
}

export default function SellerVehicleShell({
  vehicleId,
  vehicleTitle,
  initialInquiries,
  initialFormState,
}: SellerVehicleShellProps) {
  const [activeTab, setActiveTab] = useState<SellerTab>('messages');
  const [formState, setFormState] = useState(initialFormState);

  const tabContent =
    activeTab === 'messages' ? (
      <ChatPanel vehicleId={vehicleId} vehicleTitle={vehicleTitle} />
    ) : activeTab === 'inquiries' ? (
      <InquiriesPanel inquiries={initialInquiries} />
    ) : (
      <DetailsEditor vehicleId={vehicleId} formState={formState} onChange={setFormState} />
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
