import { useState, type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import {
  CheckCircle2,
  Copy,
  LogOut,
  Menu,
  Shirt,
  UserCircle,
  Users,
} from 'lucide-react';
import { auth } from '../../lib/firebase-client';
import MobileDrawer from '../MobileDrawer';

export type ApparelNav = 'catalog' | 'inquiries';

interface ApparelSellerLayoutProps {
  activeNav: ApparelNav;
  sellerUid: string;
  inquiryCount?: number;
  children: ReactNode;
}

function navLinkClass(isActive: boolean) {
  return `px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
    isActive
      ? 'bg-slate-800 text-white'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
  }`;
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

export default function ApparelSellerLayout({
  activeNav,
  sellerUid,
  inquiryCount = 0,
  children,
}: ApparelSellerLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue with client sign-out even if API fails
    }
    await signOut(auth);
    window.location.href = '/login';
  };

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(sellerUid);
      setUidCopied(true);
      window.setTimeout(() => setUidCopied(false), 2500);
    } catch {
      // Clipboard API may be unavailable; ignore silently.
    }
  };

  const inquiryBadge =
    inquiryCount > 0 ? (
      <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{inquiryCount}</span>
    ) : null;

  const brandBlock = (
    <div className="flex min-w-0 items-center gap-3">
      <div className="shrink-0 rounded-lg bg-red-600 p-2 text-white">
        <Shirt size={20} />
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold leading-tight">Apparel Dashboard</h1>
        <p className="truncate text-xs text-slate-400">Manage catalog &amp; inquiries</p>
      </div>
    </div>
  );

  const navLinks = (
    <>
      <a href="/seller/apparel" className={navLinkClass(activeNav === 'catalog')}>
        My Catalog
      </a>
      <a href="/seller/apparel/inquiries" className={navLinkClass(activeNav === 'inquiries')}>
        <Users size={16} />
        Inquiries
        {inquiryBadge}
      </a>
    </>
  );

  return (
    <div className="flex h-screen min-h-screen flex-col bg-[#f8f9fa] font-sans text-slate-900">
      <header className="z-10 shrink-0 bg-slate-900 px-4 py-3 text-white shadow-md">
        <div className="hidden h-16 items-center justify-between gap-4 md:flex">
          {brandBlock}

          <nav className="flex items-center gap-2">{navLinks}</nav>

          <div className="flex shrink-0 items-center gap-4 text-sm text-slate-300">
            <SellerUidBadge
              uid={sellerUid}
              onCopy={copyUid}
              className="hidden max-w-[160px] md:block lg:max-w-[200px]"
            />
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
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        <div className="flex h-14 items-center justify-between gap-4 md:hidden">
          {brandBlock}
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

      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        ariaLabel="Apparel dashboard menu"
      >
        <div className="flex flex-col space-y-2 text-sm font-medium">
          <a
            href="/seller/apparel"
            className={`w-full text-left ${navLinkClass(activeNav === 'catalog')}`}
            onClick={() => setIsDrawerOpen(false)}
          >
            My Catalog
          </a>
          <a
            href="/seller/apparel/inquiries"
            className={`w-full text-left ${navLinkClass(activeNav === 'inquiries')}`}
            onClick={() => setIsDrawerOpen(false)}
          >
            <Users size={16} />
            Inquiries
            {inquiryBadge}
          </a>
        </div>

        <div className="mt-6 border-t border-slate-700 pt-6">
          <SellerUidBadge uid={sellerUid} onCopy={copyUid} className="mb-4 px-1" />
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
            onClick={() => {
              setIsDrawerOpen(false);
              void handleSignOut();
            }}
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

      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
