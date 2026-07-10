import { ImageIcon } from 'lucide-react';

interface ApparelListingImageProps {
  title: string;
  imageUrl?: string;
  className?: string;
}

export default function ApparelListingImage({
  title,
  imageUrl,
  className = '',
}: ApparelListingImageProps) {
  return (
    <div className={`relative overflow-hidden ${className}`.trim()}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-slate-200 text-slate-500"
          role="img"
          aria-label={`No photo available for ${title}`}
        >
          <ImageIcon size={32} className="opacity-40" aria-hidden="true" />
          <span className="text-sm font-medium">No photo</span>
        </div>
      )}
    </div>
  );
}
