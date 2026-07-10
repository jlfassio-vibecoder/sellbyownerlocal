import { format } from 'date-fns';
import { Mail, Phone } from 'lucide-react';

export interface InquiryLeadCardProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  createdAt: string;
}

export default function InquiryLeadCard({
  name,
  email,
  phone,
  message,
  createdAt,
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
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400">
          {format(new Date(createdAt), 'MMM d, yyyy • h:mm a')}
        </span>
      </div>
      {message && (
        <div className="rounded-lg border-l-4 border-red-600 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
          {message}
        </div>
      )}
    </div>
  );
}
