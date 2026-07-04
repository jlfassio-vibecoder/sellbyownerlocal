import { useState } from 'react';
import type { InquiryRecord } from '../../schemas';
import SellerLayout, { type SellerTab } from './SellerLayout';
import InquiriesPanel from './InquiriesPanel';

interface SellerVehicleShellProps {
  vehicleTitle: string;
  initialInquiries: InquiryRecord[];
}

const TAB_PLACEHOLDERS: Partial<Record<SellerTab, string>> = {
  messages: 'Live Chat — coming in Phase 4',
  details: 'Listing Details — coming in Phase 3',
};

export default function SellerVehicleShell({
  vehicleTitle,
  initialInquiries,
}: SellerVehicleShellProps) {
  const [activeTab, setActiveTab] = useState<SellerTab>('messages');

  const tabContent =
    activeTab === 'inquiries' ? (
      <InquiriesPanel inquiries={initialInquiries} />
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
