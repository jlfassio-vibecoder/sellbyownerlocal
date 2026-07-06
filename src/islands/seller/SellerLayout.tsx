import type { ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase-client';
import SellerHeader, { type SellerTab } from './SellerHeader';

interface SellerLayoutProps {
  activeTab: SellerTab;
  onTabChange: (tab: SellerTab) => void;
  inquiryCount?: number;
  vehicleTitle?: string;
  sellerUid?: string;
  children: ReactNode;
}

export default function SellerLayout({
  activeTab,
  onTabChange,
  inquiryCount = 0,
  vehicleTitle,
  sellerUid,
  children,
}: SellerLayoutProps) {
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue with client sign-out even if API fails
    }
    await signOut(auth);
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen min-h-screen flex-col bg-[#f8f9fa] font-sans text-slate-900">
      <SellerHeader
        activeTab={activeTab}
        onTabChange={onTabChange}
        inquiryCount={inquiryCount}
        vehicleTitle={vehicleTitle}
        sellerUid={sellerUid}
        onSignOut={handleSignOut}
      />
      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

export type { SellerTab };
