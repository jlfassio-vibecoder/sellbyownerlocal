export type ApparelFilterStatus = 'draft' | 'active' | 'archived';

export interface ApparelFilterItem {
  id: string;
  title: string;
  brand: string;
  price: number;
  description: string;
  status: ApparelFilterStatus;
  galleryPhotos: string[];
}

export const APPAREL_STATUS_LABELS: Record<ApparelFilterStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

export const APPAREL_STATUS_STYLES: Record<ApparelFilterStatus, string> = {
  draft: 'bg-amber-100 text-amber-800',
  active: 'bg-green-100 text-green-800',
  archived: 'bg-slate-100 text-slate-700',
};
