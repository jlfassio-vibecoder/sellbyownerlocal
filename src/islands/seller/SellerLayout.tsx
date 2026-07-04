import type { ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { MessageCircle, Settings, Users, CheckCircle2, LogOut } from 'lucide-react';
import { auth } from '../../lib/firebase-client';

type SellerTab = 'messages' | 'inquiries' | 'details';

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
    <div className="font-sans bg-[#f8f9fa] min-h-screen flex flex-col h-screen text-slate-900">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white p-2 rounded-lg">
              <MessageCircle size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Seller Dashboard</h1>
              <p className="text-xs text-slate-400">
                {vehicleTitle ?? 'Manage listing & inquiries'}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex ml-4 gap-2">
            <button
              type="button"
              onClick={() => onTabChange('messages')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'messages' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <MessageCircle size={16} /> Live Chat
            </button>
            <button
              type="button"
              onClick={() => onTabChange('inquiries')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'inquiries' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <Users size={16} /> Contact Forms{' '}
              {inquiryCount > 0 && (
                <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {inquiryCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onTabChange('details')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'details' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <Settings size={16} /> Listing Details
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500" />
            System Online
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">{children}</main>
    </div>
  );
}

export type { SellerTab };
