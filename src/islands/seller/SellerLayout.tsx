import type { ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase-client';
import SellerHeader, { type SellerTab } from './SellerHeader';

interface SellerLayoutProps {
  activeTab: SellerTab;
  onTabChange: (tab: SellerTab) => void;
  inquiryCount?: number;
  vehicleTitle?: string;
  children: ReactNode;
}

export default function SellerLayout({
  activeTab,
  onTabChange,
  inquiryCount = 0,
  vehicleTitle,
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
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#f8f9fa] font-sans text-slate-900">
      <SellerHeader
        activeTab={activeTab}
        onTabChange={onTabChange}
        inquiryCount={inquiryCount}
        vehicleTitle={vehicleTitle}
        onSignOut={handleSignOut}
      />
      <main className="flex min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

export type { SellerTab };
