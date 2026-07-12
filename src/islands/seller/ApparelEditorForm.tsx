import { useState, type FormEvent } from 'react';
import DocumentViewer from '../DocumentViewer';
import BasicMultiUploader from './BasicMultiUploader';
import LineSheetPdfUploader from './LineSheetPdfUploader';

const INPUT_CLASS =
  'w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all text-slate-900';

const TEXTAREA_CLASS =
  'w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all text-slate-900 min-h-[100px]';

export interface ApparelEditorInitialData {
  id: string;
  title: string;
  brand: string;
  price: number;
  description: string;
  sizes: string[];
  material: string;
  colors?: string[];
  prePackRatio?: string;
  pdfLineSheetUrl?: string;
  pdfDefaultPage?: number | null;
  galleryPhotos: string[];
  status: 'draft' | 'active' | 'archived';
  isFeatured?: boolean;
  isSale?: boolean;
  salePrice?: number;
}

interface ApparelEditorFormProps {
  sellerId: string;
  initialData?: ApparelEditorInitialData;
}

function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCommaList(values: string[]): string {
  return values.join(', ');
}

function normalizeDefaultPage(value: string | number): number {
  return Math.max(1, Math.floor(Number(value)) || 1);
}

export default function ApparelEditorForm({ sellerId, initialData }: ApparelEditorFormProps) {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [brand, setBrand] = useState(initialData?.brand ?? '');
  const [price, setPrice] = useState(initialData?.price?.toString() ?? '');
  const [isFeatured, setIsFeatured] = useState(Boolean(initialData?.isFeatured));
  const [isSale, setIsSale] = useState(Boolean(initialData?.isSale));
  const [salePrice, setSalePrice] = useState(
    typeof initialData?.salePrice === 'number' ? String(initialData.salePrice) : ''
  );
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [material, setMaterial] = useState(initialData?.material ?? '');
  const [sizes, setSizes] = useState(joinCommaList(initialData?.sizes ?? []));
  const [colors, setColors] = useState(joinCommaList(initialData?.colors ?? []));
  const [prePackRatio, setPrePackRatio] = useState(initialData?.prePackRatio ?? '');
  const [pdfLineSheetUrl, setPdfLineSheetUrl] = useState(initialData?.pdfLineSheetUrl ?? '');
  const [pdfDefaultPage, setPdfDefaultPage] = useState(
    String(initialData?.pdfDefaultPage ?? 1)
  );
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>(
    initialData?.galleryPhotos ?? []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resolvedDefaultPage = normalizeDefaultPage(pdfDefaultPage);

  const persistGalleryPhotos = async (urls: string[]) => {
    if (!initialData?.id) return;

    const res = await fetch(`/api/seller/apparel/${initialData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ galleryPhotos: urls }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save gallery photos');
    }
  };

  const handleGalleryPhotosChange = (urls: string[]) => {
    setGalleryPhotos(urls);

    if (!initialData?.id) return;

    void (async () => {
      try {
        await persistGalleryPhotos(urls);
        setError(null);
        setSuccess('Gallery photos saved.');
      } catch (err) {
        console.error('Gallery photo persist failed', err);
        setSuccess(null);
        setError(
          err instanceof Error ? err.message : 'Failed to save gallery photos. Please try again.'
        );
      }
    })();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Wholesale price must be zero or a positive number.');
      setIsSubmitting(false);
      return;
    }

    if (!isEditing && parsedPrice <= 0) {
      setError('Wholesale price must be a positive number for new listings.');
      setIsSubmitting(false);
      return;
    }

    let parsedSalePrice: number | null = null;
    if (isSale) {
      if (!salePrice.trim()) {
        setError('Enter a valid sale price, or uncheck Sale.');
        setIsSubmitting(false);
        return;
      }
      parsedSalePrice = Number(salePrice);
      if (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0) {
        setError('Enter a valid sale price, or uncheck Sale.');
        setIsSubmitting(false);
        return;
      }
      if (parsedSalePrice >= parsedPrice) {
        setError('Sale price must be lower than the wholesale price.');
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      title: title.trim(),
      brand: brand.trim(),
      price: parsedPrice,
      description: description.trim(),
      material: material.trim(),
      sizes: parseCommaList(sizes),
      colors: parseCommaList(colors),
      prePackRatio: prePackRatio.trim() || undefined,
      // Must match buyer DocumentViewer + /api/clothing/[id]/catalog field name.
      pdfLineSheetUrl: pdfLineSheetUrl.trim() || undefined,
      pdfDefaultPage: normalizeDefaultPage(pdfDefaultPage),
      galleryPhotos,
      isFeatured,
      isSale,
      ...(isEditing
        ? { salePrice: isSale ? parsedSalePrice : null }
        : isSale && parsedSalePrice != null
          ? { salePrice: parsedSalePrice }
          : {}),
    };

    try {
      if (isEditing && initialData) {
        const res = await fetch(`/api/seller/apparel/${initialData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to update listing');
        }

        window.location.href = '/seller/apparel';
      } else {
        const res = await fetch('/api/seller/apparel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to create listing');
        }

        const data = (await res.json()) as { id?: string };
        if (!data.id) {
          throw new Error('Server did not return a listing id');
        }

        window.location.href = `/seller/apparel/${data.id}`;
      }
    } catch (err) {
      console.error('ApparelEditorForm submit failed', err);
      setError(err instanceof Error ? err.message : 'Failed to save listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mx-auto max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={INPUT_CLASS}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="brand" className="mb-1 block text-sm font-medium text-slate-700">
            Brand
          </label>
          <input
            id="brand"
            type="text"
            required
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={INPUT_CLASS}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div>
        <label htmlFor="price" className="mb-1 block text-sm font-medium text-slate-700">
          Wholesale Price
        </label>
        <input
          id="price"
          type="number"
          step="0.01"
          min="0"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={INPUT_CLASS}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            disabled={isSubmitting}
            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
          />
          Featured (shows at top of catalog)
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isSale}
            onChange={(e) => {
              setIsSale(e.target.checked);
              if (!e.target.checked) setSalePrice('');
            }}
            disabled={isSubmitting}
            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
          />
          On Sale
        </label>
        {isSale && (
          <div>
            <label htmlFor="salePrice" className="mb-1 block text-sm font-medium text-slate-700">
              Sale Price
            </label>
            <input
              id="salePrice"
              type="number"
              step="0.01"
              min="0"
              required={isSale}
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className={INPUT_CLASS}
              disabled={isSubmitting}
            />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={TEXTAREA_CLASS}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="material" className="mb-1 block text-sm font-medium text-slate-700">
          Material
        </label>
        <input
          id="material"
          type="text"
          required
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          className={INPUT_CLASS}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="sizes" className="mb-1 block text-sm font-medium text-slate-700">
            Sizes
          </label>
          <input
            id="sizes"
            type="text"
            required
            placeholder="S, M, L, XL"
            value={sizes}
            onChange={(e) => setSizes(e.target.value)}
            className={INPUT_CLASS}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-slate-500">Comma-separated</p>
        </div>
        <div>
          <label htmlFor="colors" className="mb-1 block text-sm font-medium text-slate-700">
            Colors
          </label>
          <input
            id="colors"
            type="text"
            placeholder="Navy, Black, Olive"
            value={colors}
            onChange={(e) => setColors(e.target.value)}
            className={INPUT_CLASS}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-slate-500">Comma-separated</p>
        </div>
      </div>

      <div>
        <label htmlFor="prePackRatio" className="mb-1 block text-sm font-medium text-slate-700">
          Pre-pack Ratio
        </label>
        <input
          id="prePackRatio"
          type="text"
          placeholder="M-L-XL-2XL (2-4-4-2)"
          value={prePackRatio}
          onChange={(e) => setPrePackRatio(e.target.value)}
          className={INPUT_CLASS}
          disabled={isSubmitting}
        />
      </div>

      <LineSheetPdfUploader
        sellerId={sellerId}
        itemId={initialData?.id}
        value={pdfLineSheetUrl}
        onChange={setPdfLineSheetUrl}
        pdfDefaultPage={resolvedDefaultPage}
        disabled={isSubmitting}
      />

      <div>
        <label htmlFor="pdfDefaultPage" className="mb-1 block text-sm font-medium text-slate-700">
          Default Catalog Page
        </label>
        <input
          id="pdfDefaultPage"
          type="number"
          min={1}
          step={1}
          value={pdfDefaultPage}
          onChange={(e) => setPdfDefaultPage(e.target.value)}
          className={INPUT_CLASS}
          disabled={isSubmitting || !pdfLineSheetUrl}
        />
        <p className="mt-1 text-xs text-slate-500">
          Buyers open the catalog at this page. Change it and check the preview below.
        </p>
      </div>
      </div>

      {pdfLineSheetUrl.trim() && initialData?.id ? (
        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-slate-700">Catalog Preview</p>
          <DocumentViewer
            title="Brand Catalog Preview"
            proxyUrl={`/api/clothing/${initialData.id}/catalog`}
            originalUrl={pdfLineSheetUrl}
            openButtonLabel="Open Full Catalog"
            defaultPage={resolvedDefaultPage}
          />
        </div>
      ) : null}

      <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="mb-1 block text-sm font-medium text-slate-700">Gallery Photos</p>
        <BasicMultiUploader
          sellerId={sellerId}
          value={galleryPhotos}
          onChange={handleGalleryPhotosChange}
          disabled={isSubmitting}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-red-600 px-6 py-3 font-bold text-white shadow-sm transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? 'Saving...'
          : isEditing
            ? 'Save Changes'
            : 'Create Catalog Item'}
      </button>
      </div>
    </form>
  );
}
