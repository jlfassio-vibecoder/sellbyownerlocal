import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ImageIcon, Loader2, Upload, XCircle } from 'lucide-react';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from '../../lib/firebase-client';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MATCH_POLL_INTERVAL_MS = 2500;
const MATCH_POLL_TIMEOUT_MS = 90_000;

interface BulkImageUploaderProps {
  sellerId: string;
  embedded?: boolean;
}

interface MatchResult {
  filename: string;
  itemCode: string;
  status: 'matched' | 'unmatched' | 'ocr_failed' | string;
  message: string;
  listingId: string | null;
  listingTitle: string | null;
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function uploadFile(
  sellerId: string,
  file: File,
  onProgress: (bytesTransferred: number, totalBytes: number) => void
): Promise<string> {
  const filename = sanitizeFilename(file.name);
  const objectRef = ref(storage, `apparel-images/staging/${sellerId}/${filename}`);
  const task = uploadBytesResumable(objectRef, file, {
    contentType: file.type || 'image/jpeg',
  });

  return new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        onProgress(snapshot.bytesTransferred, snapshot.totalBytes);
      },
      (err) => reject(err),
      () => resolve(filename)
    );
  });
}

async function fetchMatchResults(filenames: string[]): Promise<MatchResult[]> {
  const res = await fetch('/api/seller/apparel/image-matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filenames }),
  });
  if (!res.ok) {
    throw new Error('Failed to load match results');
  }
  const data = (await res.json()) as { results?: MatchResult[] };
  return data.results ?? [];
}

function summarizeMatches(results: MatchResult[]): ToastState {
  const matched = results.filter((r) => r.status === 'matched');
  const unmatched = results.filter((r) => r.status === 'unmatched');
  const failed = results.filter((r) => r.status === 'ocr_failed');

  if (matched.length > 0 && unmatched.length === 0 && failed.length === 0) {
    const codes = matched.map((r) => r.itemCode).filter(Boolean).join(', ');
    return {
      type: 'success',
      message: `Matched ${matched.length} image${matched.length === 1 ? '' : 's'}${codes ? `: ${codes}` : ''}. Refresh to see photos on drafts.`,
    };
  }

  if (matched.length === 0) {
    const codes = [...unmatched, ...failed]
      .map((r) => r.itemCode || r.filename)
      .filter(Boolean)
      .slice(0, 5)
      .join(', ');
    return {
      type: 'error',
      message: `No draft matches found${codes ? ` for ${codes}` : ''}. Check that draft titles include the style codes from your images.`,
    };
  }

  return {
    type: 'info',
    message: `Matched ${matched.length}, unmatched ${unmatched.length}${failed.length ? `, OCR failed ${failed.length}` : ''}. Refresh to update draft photos.`,
  };
}

export default function BulkImageUploader({
  sellerId,
  embedded = false,
}: BulkImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const pollMatchResults = async (filenames: string[]) => {
    setMatching(true);
    const startedAt = Date.now();

    try {
      while (Date.now() - startedAt < MATCH_POLL_TIMEOUT_MS) {
        const results = await fetchMatchResults(filenames);
        if (results.length >= filenames.length) {
          setMatchResults(results);
          setToast(summarizeMatches(results));
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, MATCH_POLL_INTERVAL_MS));
      }

      const partial = await fetchMatchResults(filenames);
      setMatchResults(partial);
      if (partial.length > 0) {
        setToast(summarizeMatches(partial));
      } else {
        setToast({
          type: 'info',
          message:
            'Still processing matches. Wait a bit longer, then refresh the dashboard to check draft photos.',
        });
      }
    } catch (err) {
      console.error('Match polling failed', err);
      setToast({
        type: 'error',
        message: 'Uploaded, but could not load match results. Check Cloud Function logs.',
      });
    } finally {
      setMatching(false);
    }
  };

  const handleUploadBatch = async (files: FileList | File[]) => {
    setError('');
    setSuccess(false);
    setMatchResults([]);
    setToast(null);

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(isImageFile);

    if (imageFiles.length === 0) {
      setError('Please upload one or more image files.');
      return;
    }

    if (imageFiles.length < fileArray.length) {
      setError('Some files were skipped because they are not images.');
    }

    const oversized = imageFiles.filter((f) => f.size > MAX_IMAGE_BYTES);
    if (oversized.length > 0) {
      setError(`${oversized.length} file(s) exceed the 10MB limit and were not uploaded.`);
    }

    const toUpload = imageFiles.filter((f) => f.size <= MAX_IMAGE_BYTES);
    if (toUpload.length === 0) {
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

    const totalBytes = toUpload.reduce((sum, f) => sum + f.size, 0);
    const bytesByFile = new Map<File, number>();
    const uploadedFilenames: string[] = [];

    try {
      for (const file of toUpload) {
        const filename = await uploadFile(sellerId, file, (transferred) => {
          bytesByFile.set(file, transferred);
          const transferredTotal = [...bytesByFile.values()].reduce((a, b) => a + b, 0);
          const pct = totalBytes > 0 ? Math.round((transferredTotal / totalBytes) * 100) : 0;
          setProgress(Math.min(pct, 100));
        });
        bytesByFile.set(file, file.size);
        uploadedFilenames.push(filename);
      }

      setUploadedCount(toUpload.length);
      setSuccess(true);
      setProgress(100);
      setToast({
        type: 'info',
        message: `Uploaded ${toUpload.length} image${toUpload.length === 1 ? '' : 's'}. Matching style codes to drafts…`,
      });
      void pollMatchResults(uploadedFilenames);
    } catch (err) {
      console.error('Bulk image upload failed', err);
      setError(err instanceof Error ? err.message : 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFilesSelected = (files: FileList | null | undefined) => {
    if (files && files.length > 0) void handleUploadBatch(files);
  };

  return (
    <section
      className={
        embedded
          ? ''
          : 'mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'
      }
    >
      {!embedded ? (
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">Bulk Image Upload</h3>
          <p className="mt-1 text-sm text-slate-500">
            Drop screenshots or product images. We will match style codes to your draft catalog items.
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-500">
          Drop screenshots or product images. We will match style codes to your draft catalog items.
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p>
            {uploadedCount} image{uploadedCount === 1 ? '' : 's'} uploaded successfully! Our AI is
            matching style codes to your drafts in the background.
            {matching ? ' Checking results…' : ''}
          </p>
          {matchResults.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {matchResults.map((result) => (
                <li key={result.filename} className="flex items-start gap-2">
                  {result.status === 'matched' ? (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-700" />
                  ) : (
                    <XCircle size={16} className="mt-0.5 shrink-0 text-amber-700" />
                  )}
                  <span>
                    <span className="font-semibold">{result.itemCode || result.filename}</span>
                    {': '}
                    {result.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFilesSelected(e.target.files)}
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
          onFilesSelected(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:bg-slate-50 ${
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
        ) : matching ? (
          <>
            <Loader2 size={32} className="mb-3 animate-spin text-slate-400" />
            <p className="text-sm font-medium text-slate-900">Matching style codes…</p>
          </>
        ) : success ? (
          <>
            <CheckCircle2 size={32} className="mb-3 text-green-500" />
            <p className="text-sm font-medium text-slate-900">Images received</p>
            <p className="mt-1 text-xs text-slate-500">Click or drag here to upload more images</p>
          </>
        ) : (
          <>
            <Upload size={32} className="mb-3 text-slate-400" />
            <p className="text-sm font-medium text-slate-900">Drag and drop product images</p>
            <p className="mt-1 text-xs text-slate-500">or click to browse (max 10MB each)</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              <ImageIcon size={14} />
              Multiple images supported
            </div>
          </>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-md px-4 py-3 font-medium text-white shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
                ? 'bg-red-600'
                : 'bg-slate-800'
          }`}
        >
          {toast.message}
        </div>
      )}
    </section>
  );
}
