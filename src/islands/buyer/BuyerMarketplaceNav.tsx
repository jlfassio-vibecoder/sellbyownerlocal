import { useState, type MouseEvent } from 'react';
import { Heart, Info, LayoutGrid, LogIn, Menu, Search, User, UserCircle } from 'lucide-react';
import MobileDrawer from '../MobileDrawer';

interface BuyerMarketplaceNavProps {
  isLoggedIn?: boolean;
  displayName?: string;
}

const linkClass =
  'inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 transition-colors hover:text-slate-950';

const drawerLinkClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100';

export default function BuyerMarketplaceNav({
  isLoggedIn = false,
  displayName = 'there',
}: BuyerMarketplaceNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const goToVehicleSearch = (event: MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname !== '/vehicles') return;
    event.preventDefault();
    const input = document.getElementById('vehicle-search');
    if (window.location.hash !== '#vehicle-search') {
      window.history.pushState(
        null,
        '',
        `${window.location.pathname}${window.location.search}#vehicle-search`
      );
    }
    if (input instanceof HTMLInputElement) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus({ preventScroll: true });
    }
    setDrawerOpen(false);
  };

  return (
    <>
      <nav
        className="sticky top-0 z-40 border-b border-slate-200 bg-white"
        aria-label="Marketplace"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="hidden items-center gap-6 md:flex">
            <a href="/vehicles#vehicle-search" className={linkClass} onClick={goToVehicleSearch}>
              <Search size={16} aria-hidden="true" />
              Search Vehicles
            </a>
            <a href="/seller" className={linkClass}>
              Sell
            </a>
            <a href="/how-it-works" className={linkClass}>
              How It Works
            </a>
          </div>
          {/* Spacer keeps right actions aligned on mobile when desktop links are hidden */}
          <div className="md:hidden" aria-hidden="true" />

          <div className="flex items-center gap-2">
            <a
              href="/account"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Favorites and account"
            >
              <Heart size={18} aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-800 transition-colors hover:bg-slate-50"
              aria-label="Open menu"
            >
              <User size={16} aria-hidden="true" />
              <Menu size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ariaLabel="Marketplace menu"
        variant="light"
      >
        <a
          href="/"
          className="mb-6 flex items-center gap-2"
          onClick={() => setDrawerOpen(false)}
        >
          <img src="/images/logo.png" alt="" className="h-8 w-auto" />
          <span className="text-sm font-bold tracking-tight text-slate-900">
            Sell By Owner Local
          </span>
        </a>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            {isLoggedIn ? `Welcome, ${displayName}` : 'Welcome'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isLoggedIn ? 'Manage your marketplace account' : 'Sign in to personalize your experience'}
          </p>
        </div>

        {isLoggedIn ? (
          <div className="mb-6 space-y-2">
            <a href="/account" className={drawerLinkClass} onClick={() => setDrawerOpen(false)}>
              <UserCircle size={18} aria-hidden="true" />
              Account
            </a>
            <a href="/seller" className={drawerLinkClass} onClick={() => setDrawerOpen(false)}>
              <LayoutGrid size={18} aria-hidden="true" />
              Seller dashboard
            </a>
          </div>
        ) : (
          <a
            href="/login"
            className="mb-6 flex items-center justify-center gap-2 rounded-lg border-2 border-slate-900 px-4 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-900 hover:text-white"
            onClick={() => setDrawerOpen(false)}
          >
            <LogIn size={16} aria-hidden="true" />
            Sign in
          </a>
        )}

        <div className="mb-4 space-y-1 border-t border-slate-200 pt-4 md:hidden">
          <a
            href="/vehicles#vehicle-search"
            className={drawerLinkClass}
            onClick={goToVehicleSearch}
          >
            <Search size={18} aria-hidden="true" />
            Search Vehicles
          </a>
          <a href="/seller" className={drawerLinkClass} onClick={() => setDrawerOpen(false)}>
            Sell
          </a>
          <a href="/how-it-works" className={drawerLinkClass} onClick={() => setDrawerOpen(false)}>
            How It Works
          </a>
        </div>

        <div className="space-y-1 border-t border-slate-200 pt-4">
          <a href="/about" className={drawerLinkClass} onClick={() => setDrawerOpen(false)}>
            <Info size={18} aria-hidden="true" />
            About
          </a>
        </div>
      </MobileDrawer>
    </>
  );
}
