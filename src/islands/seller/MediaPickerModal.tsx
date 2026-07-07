import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraryUrls: string[];
  initialSelectedUrls: string[];
  onSave: (urls: string[]) => void;
  maxCount?: number;
  title?: string;
}

export default function MediaPickerModal({
  isOpen,
  onClose,
  libraryUrls,
  initialSelectedUrls,
  onSave,
  maxCount,
  title = 'Select images',
}: MediaPickerModalProps) {
  const [draftSelected, setDraftSelected] = useState<string[]>(initialSelectedUrls);

  useEffect(() => {
    if (isOpen) {
      setDraftSelected(initialSelectedUrls);
    }
  }, [isOpen, initialSelectedUrls]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const atMax = maxCount != null && draftSelected.length >= maxCount;

  const toggleUrl = (url: string) => {
    setDraftSelected((prev) => {
      if (prev.includes(url)) {
        return prev.filter((item) => item !== url);
      }
      if (maxCount != null && prev.length >= maxCount) {
        return prev;
      }
      return [...prev, url];
    });
  };

  const handleSave = () => {
    onSave(draftSelected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-picker-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="media-picker-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            {maxCount != null ? (
              <p className="mt-0.5 text-xs text-slate-500">
                {draftSelected.length} of {maxCount} selected
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-500">{draftSelected.length} selected</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {libraryUrls.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No images in your media library yet. Upload photos in the Media Library section first.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {libraryUrls.map((url, index) => {
                const isSelected = draftSelected.includes(url);
                const isDisabled = !isSelected && atMax;

                return (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => toggleUrl(url)}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-600/30'
                        : isDisabled
                          ? 'cursor-not-allowed border-slate-200 opacity-40'
                          : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {isSelected ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-blue-600/25">
                        <span className="rounded-full bg-blue-600 p-1 text-white shadow-sm">
                          <Check size={14} aria-hidden="true" />
                        </span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={libraryUrls.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Selection
          </button>
        </div>
      </div>
    </div>
  );
}
