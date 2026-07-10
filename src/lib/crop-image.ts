import type { Area } from 'react-easy-crop';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = src;
  });
}

/**
 * Fetch a seller gallery image through the same-origin proxy so canvas crop
 * is not blocked by Firebase Storage CORS.
 */
export async function fetchProxiedGalleryImageBlob(imageUrl: string): Promise<Blob> {
  const res = await fetch(
    `/api/seller/apparel/gallery-image?url=${encodeURIComponent(imageUrl)}`
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Failed to load image for cropping'
    );
  }
  return res.blob();
}

/**
 * Draw the react-easy-crop pixel area onto a canvas and export as a JPEG blob.
 * `imageSrc` must be same-origin (e.g. a blob: URL from the gallery proxy).
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  quality = 0.92
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not create canvas context');
  }

  const width = Math.max(1, Math.round(pixelCrop.width));
  const height = Math.max(1, Math.round(pixelCrop.height));
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to export cropped image'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}
