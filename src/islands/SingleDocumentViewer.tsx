import { useMemo } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import PdfIframeViewer from './PdfIframeViewer';
import { isPdfUrl } from '../lib/pdf-url';
import { toDirectStorageObjectUrl } from '../lib/storage-url';

interface SingleDocumentViewerProps {
  vehicleId: string;
  url: string;
  title: string;
  description: string;
  proxyApiRoute: string;
}

export default function SingleDocumentViewer({
  url,
  title,
  description,
  proxyApiRoute,
}: SingleDocumentViewerProps) {
  const pdf = isPdfUrl(url);
  const externalUrl = useMemo(() => toDirectStorageObjectUrl(url), [url]);
  const previewUrl = proxyApiRoute;

  if (!pdf) {
    return (
      <div className="space-y-4">
        <img
          src={previewUrl}
          alt={title}
          className="h-auto w-full rounded-lg border border-slate-200 bg-white object-contain"
        />
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100"
        >
          <div className="rounded-full bg-white p-3 shadow-sm">
            <ExternalLink size={20} className="text-slate-400" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-slate-900">View full-size image</span>
          <Download size={16} className="ml-auto text-slate-400" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="rounded-full bg-white p-3 shadow-sm">
            <FileText size={28} className="text-slate-500" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        </div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          <ExternalLink size={16} aria-hidden="true" />
          Open PDF
        </a>
      </div>

      <PdfIframeViewer fileUrl={previewUrl} title={title} />

      <p className="text-xs text-slate-500">
        PDF preview not showing?{' '}
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-700 underline hover:text-slate-900"
        >
          Open in a new tab
        </a>
        .
      </p>
    </div>
  );
}
