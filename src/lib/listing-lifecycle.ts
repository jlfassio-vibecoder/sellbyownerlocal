import {
  ListingLifecycleStatusSchema,
  type ListingLifecycleStatus,
} from '../schemas';

export {
  ListingLifecycleStatusSchema,
  type ListingLifecycleStatus,
};

export const LISTING_STATUS_TRANSITIONS: Record<
  ListingLifecycleStatus,
  readonly ListingLifecycleStatus[]
> = {
  draft: ['active', 'archived'],
  active: ['pending', 'sold', 'draft', 'archived'],
  pending: ['active', 'sold', 'draft', 'archived'],
  sold: ['active', 'archived'],
  archived: ['draft', 'active'],
};

export class InvalidListingStatusTransitionError extends Error {
  readonly status = 400;
  readonly from: ListingLifecycleStatus;
  readonly to: ListingLifecycleStatus;

  constructor(from: ListingLifecycleStatus, to: ListingLifecycleStatus) {
    super(`Invalid status transition from ${from} to ${to}`);
    this.name = 'InvalidListingStatusTransitionError';
    this.from = from;
    this.to = to;
  }
}

export function canTransitionListingStatus(
  from: ListingLifecycleStatus,
  to: ListingLifecycleStatus
): boolean {
  if (from === to) return true;
  return LISTING_STATUS_TRANSITIONS[from].includes(to);
}

export function assertListingStatusTransition(
  from: ListingLifecycleStatus,
  to: ListingLifecycleStatus
): void {
  if (!canTransitionListingStatus(from, to)) {
    throw new InvalidListingStatusTransitionError(from, to);
  }
}

/** PDP / public detail: active, pending, or sold. */
export function isPubliclyViewableListingStatus(status: unknown): boolean {
  return status === 'active' || status === 'pending' || status === 'sold';
}

/** Leads, inquiries, messages, checkout, favorites — active only. */
export function isTransactionalListingStatus(status: unknown): boolean {
  return status === 'active';
}

/** Buyer contact / quote / checkout CTAs — active only. */
export function isBuyerCtaEnabledStatus(status: unknown): boolean {
  return status === 'active';
}

export function parseListingLifecycleStatus(
  value: unknown
): ListingLifecycleStatus | null {
  const parsed = ListingLifecycleStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
