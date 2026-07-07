interface PdfIframeViewerProps {
  fileUrl: string;
  title: string;
}

/**
 * Inline PDF preview using the browser's built-in PDF viewer.
 * Requires a same-origin URL (e.g. our /api/vehicles/... proxy) — not a cross-origin GCS URL.
 */
export default function PdfIframeViewer({ fileUrl, title }: PdfIframeViewerProps) {
  return (
    <iframe
      src={fileUrl}
      title={title}
      className="h-full min-h-[600px] w-full rounded-lg border-0 bg-slate-50 shadow-inner"
    />
  );
}
