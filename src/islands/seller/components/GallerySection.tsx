import { useState } from 'react';
import GalleryUploadFields from '../GalleryUploadFields';
import MediaPickerModal from '../MediaPickerModal';
import PhotoGalleryEditor from '../PhotoGalleryEditor';
import type { DetailsSectionFormProps } from './form-section-types';

interface GallerySectionProps extends DetailsSectionFormProps {
  vehicleId: string;
}

type ActivePicker = 'hero' | 'carousel' | null;

export default function GallerySection({
  vehicleId,
  watch,
  setValue,
  control,
  register,
}: GallerySectionProps) {
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const images = watch('images') ?? [];
  const heroImageUrls = watch('heroImageUrls') ?? [];
  const carouselImageUrls = watch('carouselImageUrls') ?? [];
  const libraryUrls = images;

  const closePicker = () => setActivePicker(null);

  return (
    <>
      <h2 className="mb-2 text-2xl font-bold text-slate-900">Media Library</h2>
      <p className="mb-6 text-sm text-slate-500">
        Upload all your vehicle photos here first. You will select which photos appear in specific
        sections (like the Hero or Market Valuation) below.
      </p>

      <GalleryUploadFields
        vehicleId={vehicleId}
        images={images}
        onChange={(next) => {
          const allowed = new Set(next);
          setValue('images', next, { shouldDirty: true });
          setValue(
            'heroImageUrls',
            (watch('heroImageUrls') ?? []).filter((url) => allowed.has(url)),
            { shouldDirty: true }
          );
          setValue(
            'carouselImageUrls',
            (watch('carouselImageUrls') ?? []).filter((url) => allowed.has(url)),
            { shouldDirty: true }
          );
          setValue(
            'marketImageUrls',
            (watch('marketImageUrls') ?? []).filter((url) => allowed.has(url)),
            { shouldDirty: true }
          );
          setValue(
            'galleryPhotos',
            (watch('galleryPhotos') ?? []).filter((photo) => allowed.has(photo.url)),
            { shouldDirty: true }
          );
        }}
        onHeroImageGenerated={(url) =>
          setValue('heroImageUrls', [url], { shouldDirty: true })
        }
      />

      <div className="mt-8 space-y-6 border-t border-slate-100 pt-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">Hero Image</label>
          <p className="mb-3 text-xs text-slate-500">
            The main photo shown in the overview section on your public listing.
          </p>
          <button
            type="button"
            onClick={() => setActivePicker('hero')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🖼️ Select Hero Image (Max 1)
          </button>
          {heroImageUrls.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {heroImageUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">Carousel Images</label>
          <p className="mb-3 text-xs text-slate-500">
            Photos shown in the image carousel below the overview on your public listing.
          </p>
          <button
            type="button"
            onClick={() => setActivePicker('carousel')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🖼️ Select Carousel Images
          </button>
          {carouselImageUrls.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {carouselImageUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <PhotoGalleryEditor watch={watch} setValue={setValue} control={control} register={register} />
      </div>

      {activePicker === 'hero' ? (
        <MediaPickerModal
          isOpen
          onClose={closePicker}
          libraryUrls={libraryUrls}
          initialSelectedUrls={heroImageUrls}
          maxCount={1}
          title="Select hero image"
          onSave={(urls) => {
            setValue('heroImageUrls', urls, { shouldDirty: true });
            closePicker();
          }}
        />
      ) : null}

      {activePicker === 'carousel' ? (
        <MediaPickerModal
          isOpen
          onClose={closePicker}
          libraryUrls={libraryUrls}
          initialSelectedUrls={carouselImageUrls}
          title="Select carousel images"
          onSave={(urls) => {
            setValue('carouselImageUrls', urls, { shouldDirty: true });
            closePicker();
          }}
        />
      ) : null}
    </>
  );
}
