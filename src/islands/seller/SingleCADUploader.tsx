import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import type { ApparelFilterItem } from '../../lib/apparel';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface SingleCADUploaderProps {
  onItemCreated: (item: ApparelFilterItem) => void;
  embedded?: boolean;
}

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function isImageFile(file: File): boolean {
  if (ALLOWED_IMAGE_TYPES.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp');
}

export default function SingleCADUploader({
  onItemCreated,
  embedded = false,
}: SingleCADUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleFile = async (file: File) => {
    setError('');
    setToast(null);

    if (!isImageFile(file)) {
      setError('Please upload a PNG, JPEG, or WebP image.');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/seller/apparel/extract-cad-item', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        item?: ApparelFilterItem;
      };

      if (!response.ok || !payload.item) {
        setError(payload.error ?? 'Failed to analyze CAD image. Please try again.');
        return;
      }

      onItemCreated(payload.item);
      setToast({
        type: 'success',
        message: `Created draft “${payload.item.title}” from CAD image.`,
      });
    } catch {
      setError('Failed to analyze CAD image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileSelected = (file: File | undefined) => {
    if (file) void handleFile(file);
  };

  return (
    <section
      className={
        embedded
          ? ''
          : 'mb-6 rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm sm:p-5'
      }
    >
      {!embedded ? (
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">Add Single Item from CAD</h3>
          <p className="mt-1 text-xs text-slate-500">
            Upload one CAD or spec sheet image to OCR details and create a draft listing instantly.
          </p>
        </div>
      ) : (
        <p className="mb-3 text-xs text-slate-500">
          Upload one CAD or spec sheet image to OCR details and create a draft listing instantly.
        </p>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isUploading) {
            onFileSelected(e.dataTransfer.files[0]);
          }
        }}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          isUploading
            ? 'border-slate-200 bg-slate-50'
            : 'border-slate-300 bg-slate-50 hover:border-red-400 hover:bg-red-50/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={isUploading}
          onChange={(e) => onFileSelected(e.target.files?.[0])}
        />

        {isUploading ? (
          <>
            <Loader2 size={28} className="mb-2 animate-spin text-red-600" />
            <p className="text-sm font-medium text-slate-900">Analyzing CAD image...</p>
          </>
        ) : (
          <>
            <Upload size={28} className="mb-2 text-slate-400 group-hover:text-red-600" />
            <p className="text-sm font-medium text-slate-900">Add Single Item from CAD</p>
            <p className="mt-1 text-xs text-slate-500">Click or drag a spec image here (max 10MB)</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              <ImageIcon size={14} />
              PNG, JPEG, or WebP
            </div>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-md px-4 py-3 font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </section>
  );
}
