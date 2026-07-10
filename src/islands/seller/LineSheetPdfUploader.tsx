import { useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, FileText, Loader2, Upload } from 'lucide-react';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from '../../lib/firebase-client';

const MAX_PDF_BYTES = 50 * 1024 * 1024;

interface LineSheetPdfUploaderProps {
  sellerId: string;
  itemId?: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === 'application/pdf' || name.endsWith('.pdf');
}

function sanitizeFilename(filename: string): string {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function filenameFromUrl(url: string): string {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const last = path.split('/').pop();
    if (last) return last.split('?')[0] || 'Uploaded PDF';
  } catch {
    // fall through
  }
  return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'Uploaded PDF');
}

async function uploadLineSheetPdf(
  sellerId: string,
  itemKey: string,
  file: File
): Promise<string> {
  const filename = `${Date.now()}-${sanitizeFilename(file.name)}`;
  const objectRef = ref(storage, `apparel-pdfs/${sellerId}/${itemKey}/${filename}`);
  const task = uploadBytesResumable(objectRef, file, {
    contentType: 'application/pdf',
  });

  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', () => {}, reject, () => resolve());
  });

  return getDownloadURL(task.snapshot.ref);
}

/** Persist pdfLineSheetUrl on the listing so the buyer DocumentViewer can render it. */
async function persistPdfLineSheetUrl(itemId: string, pdfLineSheetUrl: string): Promise<void> {
  const res = await fetch(`/api/seller/apparel/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfLineSheetUrl }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Failed to save catalog PDF to listing'
    );
  }
}

export default function LineSheetPdfUploader({
  sellerId,
  itemId,
  value,
  onChange,
  disabled = false,
}: LineSheetPdfUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    setSavedHint(null);

    if (!isPdfFile(file)) {
      setError('Please upload a PDF file.');
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      setError('File size exceeds 50MB limit.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('You must be signed in to upload. Please sign in again from the login page.');
      return;
    }

    if (user.uid !== sellerId) {
      setError('Account mismatch. Please sign in with the correct seller account.');
      return;
    }

    setUploading(true);

    try {
      const trimmedItemId = itemId?.trim();
      const itemKey = trimmedItemId || 'drafts';
      const url = await uploadLineSheetPdf(sellerId, itemKey, file);
      onChange(url);

      // Buyer page reads listing.pdfLineSheetUrl from Firestore — persist immediately when editing.
      if (trimmedItemId) {
        await persistPdfLineSheetUrl(trimmedItemId, url);
        setSavedHint('Saved to listing — visible on the public item page.');
      } else {
        setSavedHint('PDF attached — click Create Catalog Item to save it with the listing.');
      }
    } catch (err) {
      console.error('Line sheet PDF upload failed', err);
      setError(err instanceof Error ? err.message : 'Failed to upload PDF. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isDisabled = disabled || uploading;
  const displayName = value ? filenameFromUrl(value) : null;

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <FileText size={16} aria-hidden="true" />
        Brand Catalog PDF
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Upload a one-off line sheet or brand catalog PDF to show on the public listing.
      </p>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
        }}
        className="hidden"
        accept="application/pdf,.pdf"
        disabled={isDisabled}
      />

      {value ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-green-800">Catalog PDF on file</p>
            <p className="truncate text-xs text-green-700">{displayName}</p>
            <a
              href={value}
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
        disabled={isDisabled}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-70"
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Uploading…
          </>
        ) : value ? (
          <>
            <Upload size={16} aria-hidden="true" />
            Replace File
          </>
        ) : (
          <>
            <Upload size={16} aria-hidden="true" />
            Upload Brand Catalog PDF
          </>
        )}
      </button>

      {savedHint ? (
        <p className="mt-2 text-xs text-green-700" role="status">
          {savedHint}
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
