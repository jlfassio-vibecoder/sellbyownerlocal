import { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import MobileDrawer from '../MobileDrawer';

export type SellerTab = 'messages' | 'inquiries' | 'details';

interface SellerHeaderBaseProps {
  inquiryCount?: number;
  vehicleTitle?: string;
  sellerUid?: string;
  onSignOut: () => void;
}

interface SellerHeaderStateProps extends SellerHeaderBaseProps {
  navigationMode?: 'state';
  activeTab: SellerTab;
  onTabChange: (tab: SellerTab) => void;
  linkBasePath?: never;
}

interface SellerHeaderLinkProps extends SellerHeaderBaseProps {
  navigationMode: 'link';
  linkBasePath: string;
  activeTab?: never;
  onTabChange?: never;
}

type SellerHeaderProps = SellerHeaderStateProps | SellerHeaderLinkProps;

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

function SellerUidBadge({
  uid,
  onCopy,
  className = '',
}: {
  uid: string;
  onCopy: () => void;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 items-start gap-2 ${className}`} aria-label="Account identifier">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Your UID</p>
        <p className="mt-0.5 truncate font-mono text-xs text-slate-200" title={uid}>
          {uid}
        </p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        aria-label="Copy UID"
        title="Copy UID"
      >
        <Copy size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function SellerHeader(props: SellerHeaderProps) {
  const {
    inquiryCount = 0,
    vehicleTitle,
    sellerUid,
    onSignOut,
    navigationMode = 'state',
  } = props;
  const activeTab = navigationMode === 'state' ? props.activeTab : undefined;
  const onTabChange = navigationMode === 'state' ? props.onTabChange : undefined;
  const linkBasePath = navigationMode === 'link' ? props.linkBasePath : undefined;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);

  const copyUid = async () => {
    if (!sellerUid) return;

    try {
      await navigator.clipboard.writeText(sellerUid);
      setUidCopied(true);
      window.setTimeout(() => setUidCopied(false), 2500);
    } catch {
      // Clipboard API may be unavailable; ignore silently.
    }
  };

  const tabs: TabConfig[] = [
    { id: 'messages', label: 'Live Chat', icon: MessageCircle },
    { id: 'inquiries', label: 'Contact Forms', icon: Users },
    { id: 'details', label: 'Listing Details', icon: Settings },
  ];

  const selectTab = (tab: SellerTab) => {
    onTabChange?.(tab);
    setIsDrawerOpen(false);
  };

  const tabClass = (tabId: SellerTab) =>
    tabButtonClass(navigationMode === 'state' && activeTab === tabId);

  const inquiryBadge = (tabId: SellerTab) =>
    tabId === 'inquiries' && inquiryCount > 0 ? (
      <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{inquiryCount}</span>
    ) : null;

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
            {tabs.map(({ id, label, icon: Icon }) =>
              navigationMode === 'link' && linkBasePath ? (
                <a key={id} href={`${linkBasePath}?tab=${id}`} className={tabClass(id)}>
                  <Icon size={16} />
                  {label}
                  {inquiryBadge(id)}
                </a>
              ) : (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectTab(id)}
                  className={tabClass(id)}
                >
                  <Icon size={16} />
                  {label}
                  {inquiryBadge(id)}
                </button>
              )
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-4 text-sm text-slate-300">
            {sellerUid ? (
              <SellerUidBadge
                uid={sellerUid}
                onCopy={copyUid}
                className="hidden max-w-[160px] md:block lg:max-w-[200px]"
              />
            ) : null}
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              System Online
            </div>
            <a
              href="/account"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <UserCircle size={14} />
              Account
            </a>
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
          {tabs.map(({ id, label, icon: Icon }) =>
            navigationMode === 'link' && linkBasePath ? (
              <a
                key={id}
                href={`${linkBasePath}?tab=${id}`}
                className={`w-full text-left ${tabClass(id)}`}
                onClick={() => setIsDrawerOpen(false)}
              >
                <Icon size={16} />
                {label}
                {inquiryBadge(id)}
              </a>
            ) : (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                className={`w-full text-left ${tabClass(id)}`}
              >
                <Icon size={16} />
                {label}
                {inquiryBadge(id)}
              </button>
            )
          )}
        </div>

        <div className="mt-6 border-t border-slate-700 pt-6">
          {sellerUid ? (
            <SellerUidBadge uid={sellerUid} onCopy={copyUid} className="mb-4 px-1" />
          ) : null}
          <a
            href="/account"
            className="mb-2 flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            onClick={() => setIsDrawerOpen(false)}
          >
            <UserCircle size={16} />
            Account
          </a>
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

      {uidCopied ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 rounded-md bg-emerald-600 px-4 py-3 font-medium text-white shadow-lg"
        >
          UID Copied
        </div>
      ) : null}
    </>
  );
}
