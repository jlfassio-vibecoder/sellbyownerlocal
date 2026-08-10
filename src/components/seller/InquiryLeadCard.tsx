import { format } from 'date-fns';
import { Mail, Phone } from 'lucide-react';
import type { FavoriteItem, IntentTier } from '../../schemas';
import { priceFormatter } from '../../utils/formatters';

export interface InquiryLeadCardProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  createdAt: string;
  items?: FavoriteItem[];
  intentTier?: IntentTier;
  intentFactors?: string[];
}

function variantLabel(item: FavoriteItem): string | null {
  const parts: string[] = [];
  if (item.sizes?.length) parts.push(`Sizes: ${item.sizes.join(', ')}`);
  if (item.colors?.length) parts.push(`Colors: ${item.colors.join(', ')}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function intentBadgeClass(tier: IntentTier): string {
  switch (tier) {
    case 'HIGH':
      return 'bg-emerald-100 text-emerald-800';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-800';
    case 'LOW':
      return 'bg-slate-100 text-slate-600';
  }
}

function intentBadgeLabel(tier: IntentTier): string {
  switch (tier) {
    case 'HIGH':
      return 'High Intent';
    case 'MEDIUM':
      return 'Medium Intent';
    case 'LOW':
      return 'Low Intent';
  }
}

export default function InquiryLeadCard({
  name,
  email,
  phone,
  message,
  createdAt,
  items = [],
  intentTier,
  intentFactors,
}: InquiryLeadCardProps) {
  const phoneHref = phone.replace(/[^\d+]/g, '');

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{name}</h3>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-6">
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
            >
              <Mail size={16} aria-hidden="true" />
              {email}
            </a>
            <a
              href={`tel:${phoneHref}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
            >
              <Phone size={16} aria-hidden="true" />
              {phone}
            </a>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {intentTier && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${intentBadgeClass(intentTier)}`}
            >
              {intentBadgeLabel(intentTier)}
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400">
            {format(new Date(createdAt), 'MMM d, yyyy • h:mm a')}
          </span>
          {intentFactors && intentFactors.length > 0 && (
            <p className="max-w-[16rem] text-right text-xs text-slate-500">
              {intentFactors.join(' • ')}
            </p>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => {
            const variants = variantLabel(item);
            return (
              <li
                key={item.id}
                className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-200">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {item.listingPath ? (
                    <a
                      href={item.listingPath}
                      className="text-sm font-semibold text-slate-900 hover:text-red-700"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  )}
                  <p className="mt-0.5 text-sm text-slate-600">
                    {priceFormatter.format(item.price)}
                  </p>
                  {variants && <p className="mt-1 text-xs text-slate-500">{variants}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {message && (
        <div className="rounded-lg border-l-4 border-red-600 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
          {message}
        </div>
      )}
    </div>
  );
}
