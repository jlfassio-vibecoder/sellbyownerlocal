import { Users } from 'lucide-react';
import InquiryLeadCard from '../../components/seller/InquiryLeadCard';
import type { LeadRecord } from '../../schemas';

interface LeadsPanelProps {
  leads: LeadRecord[];
}

export default function LeadsPanel({ leads }: LeadsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Marketplace Leads</h2>
          <p className="mt-1 text-sm text-slate-500">
            Quote requests from buyers who saved your items and submitted the Contact Seller form.
          </p>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Users size={48} className="mx-auto mb-4 opacity-20 text-gray-600" />
            <p className="text-lg font-medium text-gray-500">No leads yet</p>
            <p className="mt-2 text-sm text-gray-400">
              When buyers request a quote on your listings, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <InquiryLeadCard
                key={lead.id}
                id={lead.id}
                name={lead.name}
                email={lead.email}
                phone={lead.phone}
                message={lead.message}
                createdAt={lead.createdAt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
