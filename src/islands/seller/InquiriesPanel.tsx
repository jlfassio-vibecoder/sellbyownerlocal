import { Users } from 'lucide-react';
import InquiryLeadCard from '../../components/seller/InquiryLeadCard';
import type { InquiryRecord } from '../../schemas';

interface InquiriesPanelProps {
  inquiries: InquiryRecord[];
}

export default function InquiriesPanel({ inquiries }: InquiriesPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 text-2xl font-bold text-slate-900">Contact Form Inquiries</h2>

        {inquiries.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Users size={48} className="mx-auto mb-4 opacity-20 text-gray-600" />
            <p className="text-lg font-medium text-gray-500">No inquiries yet</p>
            <p className="mt-2 text-sm text-gray-400">
              When buyers submit the contact form, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inq) => (
              <InquiryLeadCard
                key={inq.id}
                id={inq.id}
                name={inq.name}
                email={inq.email}
                phone={inq.phone}
                message={inq.message}
                createdAt={inq.timestamp}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
