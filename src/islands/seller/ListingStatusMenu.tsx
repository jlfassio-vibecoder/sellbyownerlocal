import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ListingLifecycleStatus } from '../../schemas';
import {
  getAvailableListingStatusActions,
  getListingStatusConfirmCopy,
  LISTING_STATUS_ACTION_LABELS,
  LISTING_STATUS_BADGE_LABELS,
  LISTING_STATUS_BADGE_STYLES,
  requiresListingStatusConfirm,
} from '../../lib/listing-status-ui';

interface ListingStatusMenuProps {
  status: ListingLifecycleStatus;
  disabled?: boolean;
  /** Called when the user confirms a status change. Parent owns the API call. */
  onSelect: (next: ListingLifecycleStatus) => Promise<void> | void;
  badgeLabels?: Record<ListingLifecycleStatus, string>;
  badgeStyles?: Record<ListingLifecycleStatus, string>;
}

export default function ListingStatusMenu({
  status,
  disabled = false,
  onSelect,
  badgeLabels = LISTING_STATUS_BADGE_LABELS,
  badgeStyles = LISTING_STATUS_BADGE_STYLES,
}: ListingStatusMenuProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ListingLifecycleStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actions = getAvailableListingStatusActions(status);

  useEffect(() => {
    if (!open && !pendingStatus) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setPendingStatus(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, pendingStatus]);

  const applyStatus = async (next: ListingLifecycleStatus) => {
    if (isSubmitting || next === status) return;
    setIsSubmitting(true);
    try {
      await onSelect(next);
      setOpen(false);
      setPendingStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionClick = (next: ListingLifecycleStatus) => {
    if (requiresListingStatusConfirm(next)) {
      setPendingStatus(next);
      setOpen(false);
      return;
    }
    void applyStatus(next);
  };

  const confirmCopy = pendingStatus ? getListingStatusConfirmCopy(pendingStatus) : null;

  return (
    <div
      ref={rootRef}
      className="relative inline-flex"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false);
          setPendingStatus(null);
        }
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        id={menuId}
        disabled={disabled || isSubmitting || actions.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${badgeStyles[status]}`}
      >
        {badgeLabels[status]}
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && actions.length > 0 && (
        <div
          role="menu"
          aria-labelledby={menuId}
          className="absolute right-0 z-30 mt-1 min-w-[14rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              disabled={isSubmitting}
              onClick={() => handleActionClick(action)}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {LISTING_STATUS_ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      )}

      {pendingStatus && confirmCopy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${menuId}-confirm-title`}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3
              id={`${menuId}-confirm-title`}
              className="text-lg font-bold text-slate-900"
            >
              {confirmCopy.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{confirmCopy.body}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPendingStatus(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void applyStatus(pendingStatus)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isSubmitting ? 'Updating…' : confirmCopy.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
