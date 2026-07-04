import { format } from 'date-fns';
import { Users } from 'lucide-react';
import type { InquiryRecord } from '../../schemas';

interface InquiriesPanelProps {
  inquiries: InquiryRecord[];
}

export default function InquiriesPanel({ inquiries }: InquiriesPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Contact Form Inquiries</h2>

        {inquiries.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
            <Users size={48} className="mx-auto mb-4 opacity-20 text-gray-600" />
            <p className="text-lg font-medium text-gray-500">No inquiries yet</p>
            <p className="text-sm text-gray-400 mt-2">
              When buyers submit the contact form, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inq) => (
              <div
                key={inq.id}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4"
              >
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{inq.name}</h3>
                    <div className="flex gap-4 mt-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1">📞 {inq.phone}</span>
                      <span className="flex items-center gap-1">✉️ {inq.email}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {format(new Date(inq.timestamp), 'MMM d, yyyy • h:mm a')}
                  </span>
                </div>
                {inq.message && (
                  <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 italic border-l-4 border-red-600">
                    "{inq.message}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
