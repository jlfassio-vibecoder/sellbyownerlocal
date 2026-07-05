import { useState } from 'react';
import {
  CheckCircle2,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import MobileDrawer from '../MobileDrawer';

export type SellerTab = 'messages' | 'inquiries' | 'details';

interface SellerHeaderProps {
  activeTab: SellerTab;
  onTabChange: (tab: SellerTab) => void;
  inquiryCount?: number;
  vehicleTitle?: string;
  onSignOut: () => void;
}

function tabButtonClass(isActive: boolean) {
  return `px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
    isActive
      ? 'bg-slate-800 text-white'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
  }`;
}

function BrandBlock({ vehicleTitle }: { vehicleTitle?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="shrink-0 rounded-lg bg-red-600 p-2 text-white">
        <MessageCircle size={20} />
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold leading-tight">Seller Dashboard</h1>
        <p className="truncate text-xs text-slate-400">
          {vehicleTitle ?? 'Manage listing & inquiries'}
        </p>
      </div>
    </div>
  );
}

interface TabConfig {
  id: SellerTab;
  label: string;
  icon: LucideIcon;
}

export default function SellerHeader({
  activeTab,
  onTabChange,
  inquiryCount = 0,
  vehicleTitle,
  onSignOut,
}: SellerHeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const tabs: TabConfig[] = [
    { id: 'messages', label: 'Live Chat', icon: MessageCircle },
    { id: 'inquiries', label: 'Contact Forms', icon: Users },
    { id: 'details', label: 'Listing Details', icon: Settings },
  ];

  const selectTab = (tab: SellerTab) => {
    onTabChange(tab);
    setIsDrawerOpen(false);
  };

  const handleSignOut = () => {
    setIsDrawerOpen(false);
    onSignOut();
  };

  return (
    <>
      <header className="z-10 shrink-0 bg-slate-900 px-4 py-3 text-white shadow-md">
        <div className="hidden h-16 items-center justify-between gap-4 md:flex">
          <BrandBlock vehicleTitle={vehicleTitle} />

          <nav className="flex items-center gap-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                className={tabButtonClass(activeTab === id)}
              >
                <Icon size={16} />
                {label}
                {id === 'inquiries' && inquiryCount > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                    {inquiryCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-4 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              System Online
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        <div className="flex h-14 items-center justify-between gap-4 md:hidden">
          <BrandBlock vehicleTitle={vehicleTitle} />
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="shrink-0 text-slate-400 transition-colors hover:text-white"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} ariaLabel="Seller dashboard menu">
        <div className="flex flex-col space-y-2 text-sm font-medium">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`w-full text-left ${tabButtonClass(activeTab === id)}`}
            >
              <Icon size={16} />
              {label}
              {id === 'inquiries' && inquiryCount > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                  {inquiryCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-700 pt-6">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </MobileDrawer>
    </>
  );
}
