import { useRef, useState } from 'react';
import { Crop, ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from '../../lib/firebase-client';
import ApparelImageCropModal from './ApparelImageCropModal';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface BasicMultiUploaderProps {
  sellerId: string;
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function uploadImage(
  sellerId: string,
  file: Blob,
  filenameHint = 'image.jpg',
  contentType = 'image/jpeg'
): Promise<string> {
  const filename = `${Date.now()}-${sanitizeFilename(filenameHint)}`;
  const objectRef = ref(storage, `apparel-images/${sellerId}/${filename}`);
  const task = uploadBytesResumable(objectRef, file, {
    contentType: contentType || 'image/jpeg',
  });

  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', () => {}, reject, () => resolve());
  });

  return getDownloadURL(task.snapshot.ref);
}

export default function BasicMultiUploader({
  sellerId,
  value,
  onChange,
  disabled = false,
}: BasicMultiUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<{ url: string; index: number } | null>(null);

  const assertSellerAuth = (): boolean => {
    const user = auth.currentUser;
    if (!user) {
      setError('You must be signed in to upload. Please sign in again from the login page.');
      return false;
    }
    if (user.uid !== sellerId) {
      setError('Account mismatch. Please sign in with the correct seller account.');
      return false;
    }
    return true;
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);

    const fileArray = Array.from(files);
    const invalid = fileArray.filter((file) => !isImageFile(file));
    if (invalid.length > 0) {
      setError('Please upload image files only (PNG, JPEG, WebP, etc.).');
      return;
    }

    const oversized = fileArray.filter((file) => file.size > MAX_IMAGE_BYTES);
    if (oversized.length > 0) {
      setError(`${oversized.length} file(s) exceed the 10MB limit.`);
      return;
    }

    if (!assertSellerAuth()) return;

    setUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of fileArray) {
        const url = await uploadImage(sellerId, file, file.name, file.type || 'image/jpeg');
        newUrls.push(url);
      }
      onChange([...value, ...newUrls]);
    } catch (err) {
      console.error('BasicMultiUploader upload failed', err);
      setError(err instanceof Error ? err.message : 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleCropped = async (blob: Blob) => {
    if (!cropTarget) return;
    if (!assertSellerAuth()) return;

    setError(null);
    setCropping(true);

    try {
      const url = await uploadImage(sellerId, blob, 'cropped.jpg', 'image/jpeg');
      const next = [...value];
      next[cropTarget.index] = url;
      onChange(next);
      setCropTarget(null);
    } catch (err) {
      console.error('BasicMultiUploader crop upload failed', err);
      setError(err instanceof Error ? err.message : 'Failed to save cropped image. Please try again.');
    } finally {
      setCropping(false);
    }
  };

  const isDisabled = disabled || uploading || cropping;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        disabled={isDisabled}
        onChange={(e) => void handleFilesSelected(e.target.files)}
      />

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <>
            <Loader2 size={28} className="mb-2 animate-spin text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Uploading…</p>
          </>
        ) : (
          <>
            <Upload size={28} className="mb-2 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Add photos</p>
            <p className="mt-1 text-xs text-slate-500">PNG, JPEG, or WebP · up to 10MB each</p>
          </>
        )}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {value.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              <img
                src={url}
                alt={`Gallery photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    setError(null);
                    setCropTarget({ url, index });
                  }}
                  className="rounded-full bg-black/60 p-1 text-white disabled:opacity-40"
                  aria-label={`Crop photo ${index + 1}`}
                  title="Crop"
                >
                  <Crop size={14} />
                </button>
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => removeImage(index)}
                  className="rounded-full bg-black/60 p-1 text-white disabled:opacity-40"
                  aria-label={`Remove photo ${index + 1}`}
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <ImageIcon size={14} aria-hidden="true" />
          No photos yet — upload images from your device.
        </div>
      )}

      {cropTarget ? (
        <ApparelImageCropModal
          imageSrc={cropTarget.url}
          open
          saving={cropping}
          onClose={() => {
            if (!cropping) setCropTarget(null);
          }}
          onCropped={handleCropped}
        />
      ) : null}
    </div>
  );
}
