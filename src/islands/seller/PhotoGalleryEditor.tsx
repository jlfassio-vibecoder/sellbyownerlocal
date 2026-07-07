import { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { GALLERY_PHOTO_CATEGORIES } from '../../schemas';
import MediaPickerModal from './MediaPickerModal';
import type { DetailsSectionFormProps } from './components/form-section-types';
import { INPUT_CLASS_SIMPLE } from './components/form-section-types';

type PhotoGalleryEditorProps = Pick<DetailsSectionFormProps, 'watch' | 'setValue' | 'control'>;

export default function PhotoGalleryEditor({ watch, setValue, control }: PhotoGalleryEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const libraryUrls = watch('images') ?? [];
  const galleryPhotos = watch('galleryPhotos') ?? [];

  const { fields, remove, replace } = useFieldArray({
    control,
    name: 'galleryPhotos',
  });

  const handlePickerSave = (urls: string[]) => {
    const existingByUrl = new Map(galleryPhotos.map((photo) => [photo.url, photo]));
    const merged = urls.map((url) => {
      const existing = existingByUrl.get(url);
      if (existing) return existing;
      return { url, category: 'Exterior', caption: '', alt: '' };
    });
    replace(merged);
    setValue('galleryPhotos', merged, { shouldDirty: true });
    setPickerOpen(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <label className="mb-2 block text-sm font-medium text-slate-700">Photo Gallery</label>
      <p className="mb-3 text-xs text-slate-500">
        Curate your detailed, categorized photo gallery. Buyers can filter these by category.
      </p>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        🖼️ Select Photos for Public Gallery
      </button>

      {fields.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No gallery photos selected yet. Upload to the Media Library first, then choose photos
          above.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {fields.map((field, index) => {
            const categoryValue = watch(`galleryPhotos.${index}.category`) ?? field.category;
            const categoryOptions =
              categoryValue &&
              !GALLERY_PHOTO_CATEGORIES.includes(
                categoryValue as (typeof GALLERY_PHOTO_CATEGORIES)[number]
              )
                ? [categoryValue, ...GALLERY_PHOTO_CATEGORIES]
                : [...GALLERY_PHOTO_CATEGORIES];

            return (
            <li
              key={field.id}
              className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-start"
            >
              <img
                src={field.url}
                alt=""
                className="h-24 w-24 shrink-0 rounded-md border border-slate-200 object-cover"
              />

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`galleryPhotos.${index}.category`}
                    className="mb-1 block text-xs font-medium text-slate-600"
                  >
                    Category
                  </label>
                  <select
                    id={`galleryPhotos.${index}.category`}
                    {...control.register(`galleryPhotos.${index}.category`)}
                    className={INPUT_CLASS_SIMPLE}
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`galleryPhotos.${index}.caption`}
                    className="mb-1 block text-xs font-medium text-slate-600"
                  >
                    Caption
                  </label>
                  <input
                    id={`galleryPhotos.${index}.caption`}
                    type="text"
                    {...control.register(`galleryPhotos.${index}.caption`)}
                    className={INPUT_CLASS_SIMPLE}
                    placeholder="Driver's side profile"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor={`galleryPhotos.${index}.alt`}
                    className="mb-1 block text-xs font-medium text-slate-600"
                  >
                    Alt text (optional)
                  </label>
                  <input
                    id={`galleryPhotos.${index}.alt`}
                    type="text"
                    {...control.register(`galleryPhotos.${index}.alt`)}
                    className={INPUT_CLASS_SIMPLE}
                    placeholder="Describe this photo for accessibility"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Leave blank to use the caption on save.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                aria-label={`Remove gallery photo ${index + 1}`}
              >
                <Trash2 size={14} aria-hidden="true" />
                Remove
              </button>
            </li>
            );
          })}
        </ul>
      )}

      {pickerOpen ? (
        <MediaPickerModal
          isOpen
          onClose={() => setPickerOpen(false)}
          libraryUrls={libraryUrls}
          initialSelectedUrls={galleryPhotos.map((photo) => photo.url)}
          title="Select gallery photos"
          onSave={handlePickerSave}
        />
      ) : null}
    </div>
  );
}
