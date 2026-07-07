import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import PdfIframeViewer from './PdfIframeViewer';
import { isPdfUrl } from '../lib/pdf-url';
import { toDirectStorageObjectUrl } from '../lib/storage-url';

interface HistoryReportViewerProps {
  vehicleId: string;
  urls: string[];
  title?: string;
  proxySegment?: string;
}

function proxyUrl(vehicleId: string, url: string, proxySegment: string): string {
  return `/api/vehicles/${encodeURIComponent(vehicleId)}/${proxySegment}?url=${encodeURIComponent(url)}`;
}

export default function HistoryReportViewer({
  vehicleId,
  urls,
  title = 'Vehicle History Report',
  proxySegment = 'history-report',
}: HistoryReportViewerProps) {
  const [index, setIndex] = useState(-1);

  const pdfUrls = useMemo(() => urls.filter(isPdfUrl), [urls]);
  const imageUrls = useMemo(() => urls.filter((url) => !isPdfUrl(url)), [urls]);
  const imageSlides = useMemo(
    () => imageUrls.map((url) => ({ src: proxyUrl(vehicleId, url, proxySegment) })),
    [vehicleId, imageUrls, proxySegment]
  );

  if (urls.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {pdfUrls.map((url, i) => {
        const externalUrl = toDirectStorageObjectUrl(url);
        const pageLabel = `${title} — PDF ${i + 1}`;

        return (
          <div
            key={`pdf-${url}-${i}`}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <PdfIframeViewer fileUrl={proxyUrl(vehicleId, url, proxySegment)} title={pageLabel} />
            <div className="border-t border-slate-100 px-4 py-3">
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                <ExternalLink size={14} aria-hidden="true" />
                Open original
              </a>
            </div>
          </div>
        );
      })}

      {imageUrls.length > 0 && (
        <div>
          <p className="mb-4 text-sm text-slate-500">
            {imageUrls.length} {imageUrls.length === 1 ? 'photo' : 'photos'} — click to view
            full size
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {imageUrls.map((url, idx) => (
              <button
                key={`img-${url}-${idx}`}
                type="button"
                onClick={() => setIndex(idx)}
                className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded border border-gray-300 shadow-sm transition-opacity hover:opacity-80"
                aria-label={`${title} — page ${idx + 1}`}
              >
                <img
                  src={proxyUrl(vehicleId, url, proxySegment)}
                  alt={`${title} — page ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {imageUrls.length > 0 && (
        <Lightbox
          open={index >= 0}
          index={index}
          close={() => setIndex(-1)}
          slides={imageSlides}
          plugins={[Zoom]}
        />
      )}
    </div>
  );
}
