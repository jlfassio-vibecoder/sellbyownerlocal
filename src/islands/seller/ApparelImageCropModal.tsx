import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { fetchProxiedGalleryImageBlob, getCroppedImg } from '../../lib/crop-image';

interface ApparelImageCropModalProps {
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onCropped: (blob: Blob) => void | Promise<void>;
  saving?: boolean;
}

export default function ApparelImageCropModal({
  imageSrc,
  open,
  onClose,
  onCropped,
  saving = false,
}: ApparelImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [localImageSrc, setLocalImageSrc] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setLocalImageSrc(null);
    setLoadingImage(true);

    void (async () => {
      try {
        const blob = await fetchProxiedGalleryImageBlob(imageSrc);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setLocalImageSrc(objectUrl);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load image for crop modal', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load image for cropping. Please try again.'
        );
      } finally {
        if (!cancelled) setLoadingImage(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, imageSrc]);

  if (!open) return null;

  const busy = saving || exporting || loadingImage;

  const handleApply = async () => {
    if (!croppedAreaPixels || !localImageSrc) return;
    setError(null);
    setExporting(true);
    try {
      const blob = await getCroppedImg(localImageSrc, croppedAreaPixels);
      await onCropped(blob);
    } catch (err) {
      console.error('Apparel image crop failed', err);
      setError(err instanceof Error ? err.message : 'Failed to crop image. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apparel-crop-title"
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 id="apparel-crop-title" className="text-lg font-bold text-slate-900">
            Crop photo
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Frame to 4:3 for marketplace cards. Drag to reposition, zoom to refine.
          </p>
        </div>

        <div className="relative h-72 w-full bg-slate-900 sm:h-80">
          {loadingImage ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-300">
              Loading image…
            </div>
          ) : localImageSrc ? (
            <Cropper
              image={localImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-300">
              {error ?? 'Image unavailable'}
            </div>
          )}
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="apparel-crop-zoom" className="mb-1 block text-sm font-medium text-slate-700">
              Zoom
            </label>
            <input
              id="apparel-crop-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              disabled={busy || !localImageSrc}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={saving || exporting}
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !croppedAreaPixels || !localImageSrc}
              onClick={() => void handleApply()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving || exporting ? 'Saving…' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
