import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { uploadDocument } from '../../lib/seller-api';
import { isPdfUrl } from '../../lib/pdf-url';

interface HistoryReportUploaderProps {
  vehicleId: string;
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function fileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split('/').pop() ?? 'file';
    return decodeURIComponent(segment);
  } catch {
    return 'Uploaded file';
  }
}

export default function HistoryReportUploader({
  vehicleId,
  urls,
  onUrlsChange,
}: HistoryReportUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setError(undefined);
    setUploading(true);

    const nextUrls = [...urls];

    try {
      for (const file of fileArray) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`"${file.name}" exceeds the 5MB limit.`);
        }

        if (!ACCEPTED_TYPES.includes(file.type)) {
          throw new Error(`"${file.name}" must be a PDF, JPEG, or PNG file.`);
        }

        const url = await uploadDocument(vehicleId, file, 'history_report');
        nextUrls.push(url);
        onUrlsChange([...nextUrls]);
      }
    } catch (err) {
      console.error('History report upload failed', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-medium text-slate-700">
        Vehicle History / CarFax
      </label>
      <input
        type="file"
        ref={inputRef}
        multiple
        accept="image/jpeg,image/png,application/pdf"
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) void handleFiles(files);
        }}
        className="hidden"
      />
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (uploading) return;
          const files = e.dataTransfer.files;
          if (files.length) void handleFiles(files);
        }}
        className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:bg-slate-50 group ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 size={32} className="mb-3 animate-spin text-slate-400" />
            <p className="text-sm font-medium text-slate-900">Uploading…</p>
          </div>
        ) : (
          <>
            <div className="mb-3 rounded-full bg-white p-3 shadow-sm transition-transform group-hover:scale-110">
              <Upload size={20} className="text-slate-500" />
            </div>
            <p className="mb-1 text-sm font-medium text-slate-900">
              {urls.length > 0
                ? 'Add more pages (PDF or photos)'
                : 'Click or drag to upload CarFax / vehicle history'}
            </p>
            <p className="text-xs text-slate-500">
              PDF, JPEG, or PNG — multiple files supported (max. 5MB each)
            </p>
            {urls.length > 0 && (
              <p className="mt-2 text-xs font-medium text-green-600">
                {urls.length} {urls.length === 1 ? 'file' : 'files'} uploaded
              </p>
            )}
          </>
        )}
      </div>

      {urls.length > 0 && (
        <ul className="mt-4 space-y-2">
          {urls.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              {isPdfUrl(url) ? (
                <FileText size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              ) : (
                <ImageIcon size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 truncate">{fileNameFromUrl(url)}</span>
              <CheckCircle2 size={16} className="shrink-0 text-green-500" aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
