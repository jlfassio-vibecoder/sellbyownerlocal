import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Sparkles, Upload, X } from 'lucide-react';
import { generateHeroImage } from '../../lib/ai-api';
import { uploadDocument } from '../../lib/seller-api';

const MAX_IMAGES = 30;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface GalleryUploadFieldsProps {
  vehicleId: string;
  images: string[];
  onChange: (images: string[]) => void;
  onHeroImageGenerated?: (url: string) => void;
}

export default function GalleryUploadFields({
  vehicleId,
  images,
  onChange,
  onHeroImageGenerated,
}: GalleryUploadFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingHero, setIsGeneratingHero] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heroToast, setHeroToast] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  useEffect(() => {
    if (!heroToast) return;
    const timer = window.setTimeout(() => setHeroToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [heroToast]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const from = dragItem.current;
    const to = dragOverItem.current;

    if (from === to) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const sorted = [...images];
    const [removed] = sorted.splice(from, 1);
    sorted.splice(to, 0, removed!);
    onChange(sorted);

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - imagesRef.current.length;
    if (remaining <= 0) {
      setError(`Maximum of ${MAX_IMAGES} media library images allowed.`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    const skippedCount = files.length - toUpload.length;

    setIsUploading(true);
    setError(null);

    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    if (skippedCount > 0) {
      errors.push(
        `Only ${remaining} slot${remaining === 1 ? '' : 's'} remaining — ${skippedCount} file(s) skipped.`
      );
    }

    try {
      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i]!;

        if (file.size > MAX_FILE_SIZE) {
          errors.push(`"${file.name}" exceeds the 20MB limit and was skipped.`);
          continue;
        }

        setUploadProgress(`Uploading ${i + 1} of ${toUpload.length}…`);

        try {
          const url = await uploadDocument(vehicleId, file, 'gallery');
          uploadedUrls.push(url);
        } catch (err) {
          console.error('Gallery upload failed for file', file.name, err);
          errors.push(
            `"${file.name}": ${err instanceof Error ? err.message : 'upload failed'}`
          );
        }
      }

      if (uploadedUrls.length > 0) {
        const merged = [...imagesRef.current, ...uploadedUrls].slice(0, MAX_IMAGES);
        imagesRef.current = merged;
        onChange(merged);
      }

      if (errors.length > 0) {
        setError(errors.join(' '));
      } else if (uploadedUrls.length === 0 && toUpload.length > 0) {
        setError('No images were uploaded. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerateHero = async () => {
    setIsGeneratingHero(true);
    setError(null);

    try {
      const { url } = await generateHeroImage(vehicleId);
      const merged = [url, ...imagesRef.current.filter((existing) => existing !== url)].slice(
        0,
        MAX_IMAGES
      );
      imagesRef.current = merged;
      onChange(merged);
      onHeroImageGenerated?.(url);
      setHeroToast({ message: 'Hero image generated', type: 'success' });
    } catch (err) {
      console.error('AI hero image generation failed', err);
      setHeroToast({
        message: err instanceof Error ? err.message : 'Hero image generation failed',
        type: 'error',
      });
    } finally {
      setIsGeneratingHero(false);
    }
  };

  const canAddMore = images.length < MAX_IMAGES;
  const showGrid = images.length > 0 || canAddMore;
  const isBusy = isUploading || isGeneratingHero;

  const openFilePicker = () => {
    if (!isBusy) {
      fileInputRef.current?.click();
    }
  };

  const handleTileKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFilePicker();
    }
  };

  return (
    <div className="border-t border-slate-100 pt-6">
      <h3 className="mb-1 text-lg font-bold text-slate-900">Upload Photos</h3>
      <p className="mb-4 text-sm text-slate-500">
        Up to {MAX_IMAGES} images (max 20MB each). Drag thumbnails to reorder. Select multiple
        files at once to bulk upload.
      </p>

      <button
        type="button"
        onClick={() => void handleGenerateHero()}
        disabled={isBusy}
        className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-70"
      >
        {isGeneratingHero ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles size={16} aria-hidden="true" />
            Generate AI Hero Image
          </>
        )}
      </button>

      {showGrid && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              draggable={!isBusy}
              onDragStart={() => {
                dragItem.current = index;
              }}
              onDragEnter={() => {
                dragOverItem.current = index;
              }}
              onDragEnd={handleSort}
              onDragOver={(e) => e.preventDefault()}
              className="relative group cursor-grab active:cursor-grabbing"
            >
              <img
                src={url}
                alt={`Media library image ${index + 1}`}
                draggable={false}
                className="pointer-events-none aspect-[4/3] w-full select-none rounded-lg border border-slate-200 object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 z-10"
                aria-label={`Remove media library image ${index + 1}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {canAddMore && (
            <div
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={handleTileKeyDown}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isBusy) return;
                if (e.dataTransfer.files.length > 0) {
                  void handleFiles(e.dataTransfer.files);
                }
              }}
              className={`aspect-[4/3] w-full rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors hover:border-red-400 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 ${isBusy ? 'opacity-70 pointer-events-none' : ''}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={(e) => {
                  const selected = e.target.files;
                  if (selected && selected.length > 0) {
                    void handleFiles(Array.from(selected));
                  }
                }}
                className="sr-only"
                accept="image/png,image/jpeg,image/webp"
                tabIndex={-1}
              />
              {isUploading ? (
                <>
                  <Loader2 size={24} className="text-slate-400 animate-spin" />
                  <span className="text-sm font-medium text-slate-900 text-center px-2">
                    {uploadProgress ?? 'Uploading…'}
                  </span>
                </>
              ) : (
                <>
                  <Upload size={22} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">+ Upload Images</span>
                  <span className="text-xs text-slate-500">
                    {images.length}/{MAX_IMAGES}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {!canAddMore && (
        <p className="text-sm text-slate-500 mb-2">
          {MAX_IMAGES}/{MAX_IMAGES} images — remove one to upload another.
        </p>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {heroToast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-3 font-medium text-white shadow-lg ${
            heroToast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {heroToast.message}
        </div>
      ) : null}
    </div>
  );
}
