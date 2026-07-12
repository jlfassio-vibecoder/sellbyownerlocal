import { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import MediaPickerModal from '../MediaPickerModal';
import MarkdownTextarea from './MarkdownTextarea';
import type { DetailsSectionFormProps } from './form-section-types';
import { GRID_TEXTAREA_CLASS } from './form-section-types';

const MAX_MODIFICATIONS = 12;

export default function UpgradesEditor({ control, watch, setValue }: DetailsSectionFormProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'modifications',
  });

  const canAdd = fields.length < MAX_MODIFICATIONS;
  const libraryUrls = watch('images') ?? [];
  const selectedUrls = watch('modificationImageUrls') ?? [];

  return (
    <>
      <h2 className="mb-2 text-2xl font-bold text-slate-900">Upgrades &amp; Modifications</h2>
      <p className="mb-6 text-sm text-slate-500">
        List aftermarket parts, custom paint, or major work and explain how each adds value. Up to{' '}
        {MAX_MODIFICATIONS} items.
      </p>

      <div className="space-y-4">
        {fields.length === 0 ? (
          <p className="text-sm text-slate-500">No upgrades yet. Add one to get started.</p>
        ) : (
          fields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">Upgrade {index + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Part or Mod Name
                  </label>
                  <MarkdownTextarea
                    value={watch(`modifications.${index}.title`) ?? ''}
                    onChange={(value) =>
                      setValue(`modifications.${index}.title`, value, { shouldDirty: true })
                    }
                    className={GRID_TEXTAREA_CLASS}
                    placeholder="Part or Mod Name"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Why does it add value?
                  </label>
                  <MarkdownTextarea
                    value={watch(`modifications.${index}.description`) ?? ''}
                    onChange={(value) =>
                      setValue(`modifications.${index}.description`, value, {
                        shouldDirty: true,
                      })
                    }
                    className={GRID_TEXTAREA_CLASS}
                    placeholder="Why does it add value?"
                  />
                </div>
              </div>
            </div>
          ))
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => append({ title: '', description: '' })}
            disabled={!canAdd}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add upgrade
          </button>
          <span className="text-xs text-slate-500">
            {fields.length} / {MAX_MODIFICATIONS}
          </span>
        </div>
      </div>

      <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
        <div>
          <h3 className="text-sm font-medium text-slate-700">Upgrade section images</h3>
          <p className="mt-1 text-xs text-slate-500">
            Optional photos shown at the bottom of Upgrades &amp; Modifications on the public
            listing (max 3).
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Select upgrade images (Max 3)
          </button>

          {selectedUrls.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-white"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {pickerOpen ? (
        <MediaPickerModal
          isOpen
          onClose={() => setPickerOpen(false)}
          libraryUrls={libraryUrls}
          initialSelectedUrls={selectedUrls}
          maxCount={3}
          title="Select upgrade images"
          onSave={(urls) => {
            setValue('modificationImageUrls', urls, { shouldDirty: true });
          }}
        />
      ) : null}
    </>
  );
}
