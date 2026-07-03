import { useMemo, useState } from 'react';
import type { GalleryPhoto } from '../schemas';

interface GalleryProps {
  photos: GalleryPhoto[];
}

export default function Gallery({ photos }: GalleryProps) {
  const categories = useMemo(() => {
    const unique = [...new Set(photos.map((photo) => photo.category))];
    return ['All', ...unique];
  }, [photos]);

  const [activeCategory, setActiveCategory] = useState('All');

  const filteredPhotos =
    activeCategory === 'All'
      ? photos
      : photos.filter((photo) => photo.category === activeCategory);

  return (
    <section id="gallery" className="mb-16 pt-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <h2 className="mb-6 text-2xl font-bold text-slate-900">Photo Gallery</h2>

        <div className="mb-8 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === category
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredPhotos.map((photo, index) => (
            <div
              key={`${photo.url}-${index}`}
              className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
            >
              <img
                src={photo.url}
                alt={photo.alt}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div>
                  <h3 className="text-lg font-semibold text-white">{photo.caption}</h3>
                  <p className="mt-1 text-sm text-slate-200">{photo.alt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
