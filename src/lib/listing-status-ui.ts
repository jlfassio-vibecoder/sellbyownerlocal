import {
  LISTING_STATUS_TRANSITIONS,
  type ListingLifecycleStatus,
} from './listing-lifecycle';

export const LISTING_STATUS_BADGE_LABELS: Record<ListingLifecycleStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  pending: 'Pending',
  sold: 'Sold',
  archived: 'Archived',
};

export const LISTING_STATUS_BADGE_STYLES: Record<ListingLifecycleStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  sold: 'bg-red-100 text-red-800',
  archived: 'bg-slate-100 text-slate-700',
};

export const LISTING_STATUS_ACTION_LABELS: Record<ListingLifecycleStatus, string> = {
  active: 'Publish / Mark Active',
  pending: 'Mark as Pending (Under Offer)',
  sold: 'Mark as Sold',
  draft: 'Hide to Draft',
  archived: 'Archive / Soft Delete',
};

export const LISTING_STATUS_FILTER_CHIPS: Array<{
  value: 'All' | ListingLifecycleStatus;
  label: string;
}> = [
  { value: 'All', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'sold', label: 'Sold' },
  { value: 'draft', label: 'Drafts' },
  { value: 'archived', label: 'Archived' },
];

export function getAvailableListingStatusActions(
  current: ListingLifecycleStatus
): ListingLifecycleStatus[] {
  return LISTING_STATUS_TRANSITIONS[current].filter((status) => status !== current);
}

export function requiresListingStatusConfirm(to: ListingLifecycleStatus): boolean {
  return to === 'sold' || to === 'archived';
}

export function getListingStatusConfirmCopy(to: ListingLifecycleStatus): {
  title: string;
  body: string;
  confirmLabel: string;
} {
  if (to === 'sold') {
    return {
      title: 'Mark as Sold?',
      body: 'Mark this item as sold? Buyers will still see the listing with a Sold badge, but new quote/inquiry CTAs will be disabled.',
      confirmLabel: 'Mark as Sold',
    };
  }

  return {
    title: 'Archive this listing?',
    body: 'Archive this listing? It will be removed from buyer searches and PDP direct links.',
    confirmLabel: 'Archive',
  };
}
