import GalleryUploadFields from '../GalleryUploadFields';
import type { DetailsSectionFormProps } from './form-section-types';

interface GallerySectionProps extends DetailsSectionFormProps {
  vehicleId: string;
}

export default function GallerySection({ vehicleId, watch, setValue }: GallerySectionProps) {
  const images = watch('images') ?? [];

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Gallery Photos</h2>
      <GalleryUploadFields
        vehicleId={vehicleId}
        images={images}
        onChange={(next) => setValue('images', next, { shouldDirty: true })}
      />
    </>
  );
}
