export type ApparelFilterStatus = 'draft' | 'active' | 'archived';

export interface ApparelFilterItem {
  id: string;
  title: string;
  brand: string;
  price: number;
  description: string;
  status: ApparelFilterStatus;
  galleryPhotos: string[];
  material?: string;
  sizes?: string[];
  colors?: string[];
  isFeatured?: boolean;
  isSale?: boolean;
  salePrice?: number;
  sortOrder?: number;
  featuredSortOrder?: number;
  createdAt?: Date | string;
}

export type ApparelItemUpdate = {
  title?: string;
  brand?: string;
  price?: number;
  description?: string;
  material?: string;
  sizes?: string[];
  colors?: string[];
  status?: ApparelFilterStatus;
  isFeatured?: boolean;
  isSale?: boolean;
  salePrice?: number | null;
};

const ITEM_CODE_TITLE_PATTERN = /^([A-Z0-9]+)\s*-\s*(.+)$/i;

export function parseItemCodeFromTitle(title: string): { itemCode: string; titleWithoutCode: string } {
  const match = title.trim().match(ITEM_CODE_TITLE_PATTERN);
  if (match) {
    return { itemCode: match[1].toUpperCase(), titleWithoutCode: match[2].trim() };
  }
  return { itemCode: '', titleWithoutCode: title.trim() };
}

export function buildTitleWithItemCode(titleWithoutCode: string, itemCode: string): string {
  const trimmedTitle = titleWithoutCode.trim();
  const code = itemCode
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  if (!code) return trimmedTitle;
  if (trimmedTitle.toUpperCase().includes(code)) return trimmedTitle;
  return trimmedTitle ? `${code} - ${trimmedTitle}` : code;
}

export function joinCommaList(values: string[] | undefined): string {
  return (values ?? []).join(', ');
}

export function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const APPAREL_STATUS_LABELS: Record<ApparelFilterStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

export const APPAREL_SELLER_STATUS_LABELS: Record<ApparelFilterStatus, string> = {
  draft: 'Draft',
  active: 'Published',
  archived: 'Archived',
};

export const APPAREL_STATUS_STYLES: Record<ApparelFilterStatus, string> = {
  draft: 'bg-amber-100 text-amber-800',
  active: 'bg-green-100 text-green-800',
  archived: 'bg-slate-100 text-slate-700',
};

export type ApparelBulkUpdate = {
  status?: ApparelFilterStatus;
  isFeatured?: boolean;
  isSale?: boolean;
};

function createdAtMs(value: Date | string | undefined): number {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(time) ? time : 0;
}

/** Full inventory: sortOrder ascending, then createdAt descending. */
export function sortBySortOrder<
  T extends { sortOrder?: number; createdAt?: Date | string },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderA = a.sortOrder ?? Number.POSITIVE_INFINITY;
    const orderB = b.sortOrder ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;
    return createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
  });
}

/** Featured merchandising: featuredSortOrder ascending, then createdAt descending. */
export function sortByFeaturedSortOrder<
  T extends { featuredSortOrder?: number; createdAt?: Date | string },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderA = a.featuredSortOrder ?? Number.POSITIVE_INFINITY;
    const orderB = b.featuredSortOrder ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;
    return createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
  });
}

/**
 * Storefront order: featured block first (by featuredSortOrder), then
 * non-featured (by sortOrder). Preserves relative order via fallbacks.
 */
export function sortFeaturedFirst<
  T extends {
    isFeatured?: boolean;
    sortOrder?: number;
    featuredSortOrder?: number;
    createdAt?: Date | string;
  },
>(items: T[]): T[] {
  const featured = sortByFeaturedSortOrder(items.filter((item) => Boolean(item.isFeatured)));
  const rest = sortBySortOrder(items.filter((item) => !item.isFeatured));
  return [...featured, ...rest];
}
