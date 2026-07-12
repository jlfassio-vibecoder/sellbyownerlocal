import { useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Trash2, Upload } from 'lucide-react';
import { deleteKbbReport, uploadDocument } from '../../lib/seller-api';

interface KbbReportUploaderProps {
  vehicleId: string;
  kbbReportUrl?: string;
  onFieldUpdate: (url: string) => void;
}

export default function KbbReportUploader({
  vehicleId,
  kbbReportUrl,
  onFieldUpdate,
}: KbbReportUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = uploading || removing;

  const handleUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const url = await uploadDocument(vehicleId, file, 'kbb_report');
      onFieldUpdate(url);
    } catch (err) {
      console.error('KBB report upload failed', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    setError(null);
    setRemoving(true);

    try {
      await deleteKbbReport(vehicleId);
      onFieldUpdate('');
    } catch (err) {
      console.error('KBB report remove failed', err);
      setError(err instanceof Error ? err.message : 'Failed to remove KBB report. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  const filename = kbbReportUrl
    ? decodeURIComponent(kbbReportUrl.split('/').pop()?.split('?')[0] ?? 'Uploaded file')
    : null;

  return (
    <div className="mb-6">
      <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-slate-700">
        How to add your KBB Report: Go to kbb.com, enter your vehicle details, and select
        &apos;Private Party Value&apos; (NOT Trade-In Value). Print to PDF or take a screenshot of
        the final graph.
      </div>

      <label className="mb-2 block text-sm font-medium text-slate-700">
        Kelley Blue Book Report
      </label>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
        }}
        className="hidden"
        accept=".pdf,image/png,image/jpeg"
        disabled={isBusy}
      />

      {kbbReportUrl ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-green-800">KBB report uploaded</p>
            <p className="truncate text-xs text-green-700">{filename}</p>
            <a
              href={kbbReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-800 hover:text-green-900"
            >
              View file
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={isBusy}
            className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label="Remove KBB report"
            title="Remove KBB report"
          >
            {removing ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isBusy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-4 py-8 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-70"
      >
        {uploading ? (
          <>
            <Loader2 size={20} className="animate-spin text-slate-400" aria-hidden="true" />
            Uploading…
          </>
        ) : (
          <>
            <Upload size={20} className="text-slate-500" aria-hidden="true" />
            {kbbReportUrl ? 'Replace KBB report' : 'Click to upload KBB report (PDF or image)'}
          </>
        )}
      </button>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
