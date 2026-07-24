import { useState } from 'react';
import MediaPickerModal from '../MediaPickerModal';
import type { DetailsSectionFormProps } from './form-section-types';

type PitchBlockImageField =
  | 'pitchBlock0ImageUrls'
  | 'pitchBlock1ImageUrls'
  | 'pitchBlock2ImageUrls'
  | 'pitchBlock3ImageUrls';

const PITCH_BLOCKS: { field: PitchBlockImageField; label: string }[] = [
  { field: 'pitchBlock0ImageUrls', label: 'Peace of Mind Guarantee' },
  { field: 'pitchBlock1ImageUrls', label: 'Recent Maintenance & Upgrades' },
  { field: 'pitchBlock2ImageUrls', label: 'Utility & Towing' },
  { field: 'pitchBlock3ImageUrls', label: 'Luxury Options' },
];

interface PitchBlockEditorProps extends Pick<DetailsSectionFormProps, 'watch' | 'setValue'> {}

export default function PitchBlockEditor({ watch, setValue }: PitchBlockEditorProps) {
  const [activeField, setActiveField] = useState<PitchBlockImageField | null>(null);
  const libraryUrls = watch('images') ?? [];

  const openPicker = (field: PitchBlockImageField) => {
    setActiveField(field);
  };

  const closePicker = () => {
    setActiveField(null);
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pt-6">
      <div>
        <h3 className="text-sm font-medium text-slate-700">Seller&apos;s Note Block Images</h3>
        <p className="mt-1 text-xs text-slate-500">
          Optional photos for each pitch block on the public listing (max 3 per block).
        </p>
      </div>

      {PITCH_BLOCKS.map(({ field, label }) => {
        const selectedUrls = (watch(field) as string[] | undefined) ?? [];

        return (
          <div key={field} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="mb-2 text-sm font-medium text-slate-800">{label}</p>
            <button
              type="button"
              onClick={() => openPicker(field)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              🖼️ Select Block Images (Max 3)
            </button>

            {selectedUrls.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-white"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() =>
                        setValue(
                          field,
                          selectedUrls.filter((_, i) => i !== index),
                          { shouldDirty: true }
                        )
                      }
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-slate-900/70 text-xs font-bold text-white hover:bg-slate-900"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      {activeField ? (
        <MediaPickerModal
          isOpen
          onClose={closePicker}
          libraryUrls={libraryUrls}
          initialSelectedUrls={(watch(activeField) as string[] | undefined) ?? []}
          maxCount={3}
          title="Select block images"
          onSave={(urls) => {
            setValue(activeField, urls, { shouldDirty: true });
          }}
        />
      ) : null}
    </div>
  );
}
