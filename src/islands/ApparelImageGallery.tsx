import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ApparelImageGalleryProps {
  images: string[];
  altText?: string;
}

export default function ApparelImageGallery({
  images,
  altText = 'Photo',
}: ApparelImageGalleryProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const gallery = useMemo(
    () =>
      images.map((url, index) => ({
        id: index,
        thumb: url,
        full: url,
        alt: `${altText} ${index + 1}`,
      })),
    [images, altText]
  );

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);

  const openModal = (index: number) => {
    setCurrentIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % gallery.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  if (gallery.length === 0) {
    return (
      <div className="my-8 flex aspect-[16/9] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500">
        No photos available
      </div>
    );
  }

  return (
    <div className="my-8 w-full">
      <div className="relative">
        <div className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8">
          {gallery.map((img, index) => (
            <button
              key={img.id}
              type="button"
              className="h-32 w-32 flex-none cursor-pointer snap-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-0 shadow-sm transition-opacity hover:opacity-90 md:h-48 md:w-48"
              onClick={() => openModal(index)}
              aria-label={`Open ${img.alt}`}
            >
              <img
                src={img.thumb}
                alt={img.alt}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm">
          <button
            type="button"
            onClick={closeModal}
            className="absolute top-6 right-6 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/80"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>

          <button
            type="button"
            onClick={prevImage}
            className="absolute left-4 z-10 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/80 md:left-8"
            aria-label="Previous image"
          >
            <ChevronLeft size={32} />
          </button>

          <button
            type="button"
            onClick={nextImage}
            className="absolute right-4 z-10 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/80 md:right-8"
            aria-label="Next image"
          >
            <ChevronRight size={32} />
          </button>

          <div className="w-full max-w-6xl px-4 md:px-20" onClick={closeModal}>
            <div
              className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={gallery[currentIndex].full}
                alt={gallery[currentIndex].alt}
                className="h-full w-full object-contain"
              />
              <div className="absolute right-0 bottom-4 left-0 text-center text-sm font-medium text-white/70 drop-shadow-md">
                {currentIndex + 1} / {gallery.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
