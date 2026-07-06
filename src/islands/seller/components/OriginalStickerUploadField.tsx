import { useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Upload } from 'lucide-react';
import { uploadDocument } from '../../../lib/seller-api';

interface OriginalStickerUploadFieldProps {
  vehicleId: string;
  windowStickerUrl?: string;
  onFieldUpdate: (url: string) => void;
}

export default function OriginalStickerUploadField({
  vehicleId,
  windowStickerUrl,
  onFieldUpdate,
}: OriginalStickerUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const url = await uploadDocument(vehicleId, file);
      onFieldUpdate(url);
    } catch (err) {
      console.error('Original sticker upload failed', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const filename = windowStickerUrl
    ? decodeURIComponent(windowStickerUrl.split('/').pop()?.split('?')[0] ?? 'Uploaded file')
    : null;

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Upload size={16} aria-hidden="true" />
        Display original sticker on listing
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Upload the factory PDF or photo to show alongside the generated sticker on the public
        listing. Save changes after uploading.
      </p>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        className="hidden"
        accept=".pdf,image/png,image/jpeg,image/webp"
        disabled={uploading}
      />

      {windowStickerUrl ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-green-800">Original sticker on file</p>
            <p className="truncate text-xs text-green-700">{filename}</p>
            <a
              href={windowStickerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-800 hover:text-green-900"
            >
              View file
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-70"
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Uploading…
          </>
        ) : windowStickerUrl ? (
          'Replace original sticker'
        ) : (
          'Upload original sticker'
        )}
      </button>

      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
