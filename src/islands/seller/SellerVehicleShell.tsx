import { useState } from 'react';
import SellerLayout, { type SellerTab } from './SellerLayout';

interface SellerVehicleShellProps {
  vehicleTitle: string;
}

const TAB_PLACEHOLDERS: Record<SellerTab, string> = {
  messages: 'Live Chat — coming in Phase 4',
  inquiries: 'Contact Forms — coming in Phase 2',
  details: 'Listing Details — coming in Phase 3',
};

export default function SellerVehicleShell({ vehicleTitle }: SellerVehicleShellProps) {
  const [activeTab, setActiveTab] = useState<SellerTab>('messages');

  return (
    <SellerLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      inquiryCount={0}
      vehicleTitle={vehicleTitle}
    >
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">{TAB_PLACEHOLDERS[activeTab]}</p>
      </div>
    </SellerLayout>
  );
}
