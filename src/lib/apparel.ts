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
