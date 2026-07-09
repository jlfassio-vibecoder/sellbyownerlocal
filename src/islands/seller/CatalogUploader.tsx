import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from '../../lib/firebase-client';

const MAX_PDF_BYTES = 50 * 1024 * 1024;

interface CatalogUploaderProps {
  sellerId: string;
}

function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === 'application/pdf' || name.endsWith('.pdf');
}

function sanitizeFilename(filename: string): string {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

export default function CatalogUploader({ sellerId }: CatalogUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpload = async (file: File) => {
    setError('');
    setSuccess(false);

    if (!isPdfFile(file)) {
      setError('Please upload a PDF catalog file.');
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
    setProgress(0);

    const filename = sanitizeFilename(file.name);
    const objectRef = ref(storage, `catalogs/${sellerId}/${filename}`);
    const task = uploadBytesResumable(objectRef, file, {
      contentType: 'application/pdf',
    });

    try {
      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setProgress(pct);
          },
          (err) => reject(err),
          () => resolve()
        );
      });
      setSuccess(true);
      setProgress(100);
    } catch (err) {
      console.error('Catalog upload failed', err);
      setError(err instanceof Error ? err.message : 'Failed to upload catalog. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileSelected = (file: File | undefined) => {
    if (file) void handleUpload(file);
  };

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">Upload Catalog PDF</h3>
        <p className="mt-1 text-sm text-slate-500">
          Upload a wholesale line sheet or catalog. We will extract items in the background.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p>
            Catalog uploaded successfully! Our AI is extracting your items in the background. This
            usually takes 15 to 30 seconds.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center rounded-lg border border-green-700 bg-white px-4 py-2 text-sm font-semibold text-green-800 shadow-sm transition-colors hover:bg-green-100"
          >
            Refresh Dashboard to View Drafts
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files?.[0])}
      />

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (uploading) return;
          onFileSelected(e.dataTransfer.files?.[0]);
        }}
        className={`group flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:bg-slate-50 ${
          uploading ? 'pointer-events-none opacity-70' : ''
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={32} className="mb-3 animate-spin text-slate-400" />
            <p className="text-sm font-medium text-slate-900">Uploading… {progress}%</p>
            <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-red-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : success ? (
          <>
            <CheckCircle2 size={32} className="mb-3 text-green-500" />
            <p className="text-sm font-medium text-slate-900">Catalog received</p>
            <p className="mt-1 text-xs text-slate-500">Click or drag here to upload another PDF</p>
          </>
        ) : (
          <>
            <Upload size={32} className="mb-3 text-slate-400 group-hover:text-red-600" />
            <p className="text-sm font-medium text-slate-900">Drag and drop your catalog PDF</p>
            <p className="mt-1 text-xs text-slate-500">or click to browse (max 50MB)</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              <FileText size={14} />
              PDF only
            </div>
          </>
        )}
      </div>
    </section>
  );
}
