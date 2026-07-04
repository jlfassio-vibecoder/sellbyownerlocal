import { useState } from 'react';
import type { InquiryRecord, VehicleFormState } from '../../schemas';
import SellerLayout, { type SellerTab } from './SellerLayout';
import DetailsEditor from './DetailsEditor';
import InquiriesPanel from './InquiriesPanel';

interface SellerVehicleShellProps {
  vehicleId: string;
  vehicleTitle: string;
  initialInquiries: InquiryRecord[];
  initialFormState: VehicleFormState;
}

const TAB_PLACEHOLDERS: Partial<Record<SellerTab, string>> = {
  messages: 'Live Chat — coming in Phase 4',
};

export default function SellerVehicleShell({
  vehicleId,
  vehicleTitle,
  initialInquiries,
  initialFormState,
}: SellerVehicleShellProps) {
  const [activeTab, setActiveTab] = useState<SellerTab>('messages');
  const [formState, setFormState] = useState(initialFormState);

  const tabContent =
    activeTab === 'inquiries' ? (
      <InquiriesPanel inquiries={initialInquiries} />
    ) : activeTab === 'details' ? (
      <DetailsEditor vehicleId={vehicleId} formState={formState} onChange={setFormState} />
    ) : (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">{TAB_PLACEHOLDERS[activeTab]}</p>
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
