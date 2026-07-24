import { useRef, useState, type ChangeEvent } from 'react';
import { GripVertical, Loader2, Plus, Trash2 } from 'lucide-react';
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { promoteComparableBlockReason } from '../../../lib/build-vehicle-from-comparable';
import {
  promoteComparableToMarketplace,
  SellerApiError,
  uploadDocument,
} from '../../../lib/seller-api';
import type { VehicleFormState } from '../../../schemas';
import { GRID_INPUT_CLASS } from './form-section-types';

const MATCH_LEVEL_OPTIONS = [
  { value: 'exact', label: 'Exact Match' },
  { value: 'similar', label: 'Similar Build' },
  { value: 'base', label: 'Base Model' },
] as const;

const COMP_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

interface ComparableRowProps {
  index: number;
  vehicleId: string;
  register: UseFormRegister<VehicleFormState>;
  setValue: UseFormSetValue<VehicleFormState>;
  watch: UseFormWatch<VehicleFormState>;
  draggingIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  onRemove: (index: number) => void;
}

export default function ComparableRow({
  index,
  vehicleId,
  register,
  setValue,
  watch,
  draggingIndex,
  dragOverIndex,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onRemove,
}: ComparableRowProps) {
  const base = `marketValuation.comparables.${index}` as const;
  const differences = watch(`${base}.differences`) ?? [];
  const comparable = watch(base);
  const imageUrl = comparable?.imageUrl?.trim() || '';
  const promotedVehicleId = comparable?.promotedVehicleId?.trim();
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promotePath, setPromotePath] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [thumbBroken, setThumbBroken] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const blockReason = comparable ? promoteComparableBlockReason(comparable) : 'Incomplete comparable';

  const appendDifference = () => {
    setValue(`${base}.differences`, [...differences, ''], { shouldDirty: true });
  };

  const removeDifference = (diffIndex: number) => {
    setValue(
      `${base}.differences`,
      differences.filter((_, i) => i !== diffIndex),
      { shouldDirty: true }
    );
  };

  const handlePromote = async () => {
    setPromoteError(null);
    setPromotePath(null);

    if (blockReason) {
      setPromoteError(`${blockReason}. Save the listing after filling required fields.`);
      return;
    }

    setPromoting(true);
    try {
      const result = await promoteComparableToMarketplace(vehicleId, index);
      setValue(`${base}.promotedVehicleId`, result.vehicleId, { shouldDirty: true });
      setPromotePath(result.path);
    } catch (error) {
      setPromoteError(
        error instanceof SellerApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to promote comparable'
      );
    } finally {
      setPromoting(false);
    }
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploadError(null);
    setUploadingImage(true);
    try {
      const url = await uploadDocument(vehicleId, file, 'comps');
      setValue(`${base}.imageUrl`, url, { shouldDirty: true });
      setThumbBroken(false);
    } catch (error) {
      setImageUploadError(
        error instanceof SellerApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Image upload failed'
      );
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const clearImage = () => {
    setValue(`${base}.imageUrl`, '', { shouldDirty: true });
    setThumbBroken(false);
    setImageUploadError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  return (
    <div
      onDragEnter={() => onDragEnter(index)}
      onDragOver={(e) => e.preventDefault()}
      className={`space-y-3 p-4 bg-white border rounded-lg transition-colors ${
        draggingIndex === index ? 'opacity-50' : ''
      } ${
        dragOverIndex === index && draggingIndex !== null && draggingIndex !== index
          ? 'border-red-400 ring-1 ring-red-400'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div
          draggable
          onDragStart={() => onDragStart(index)}
          onDragEnd={onDragEnd}
          className="flex shrink-0 items-center self-stretch cursor-grab active:cursor-grabbing pb-2 text-slate-400 hover:text-slate-600 touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical size={18} />
        </div>
        <div className="min-w-0 flex-[1_1_10rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Title / Source</label>
          <input
            {...register(`${base}.label`)}
            placeholder="Dealer"
            className={GRID_INPUT_CLASS}
          />
        </div>
        <div className="min-w-0 flex-[0_1_7rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Price</label>
          <input
            type="number"
            {...register(`${base}.price`, { valueAsNumber: true })}
            placeholder="24500"
            className={GRID_INPUT_CLASS}
          />
        </div>
        <div className="min-w-0 flex-[0_1_6rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Mileage</label>
          <input
            type="number"
            {...register(`${base}.mileage`, { valueAsNumber: true })}
            placeholder="98000"
            className={GRID_INPUT_CLASS}
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="shrink-0 p-2 text-slate-400 hover:text-red-600 transition-colors"
          aria-label="Remove comp"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 pl-7">
        <div className="min-w-0 flex-[0_1_5rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
          <input
            type="number"
            {...register(`${base}.year`, { valueAsNumber: true })}
            placeholder="2017"
            className={GRID_INPUT_CLASS}
          />
        </div>
        <div className="min-w-0 flex-[1_1_6rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Make</label>
          <input {...register(`${base}.make`)} placeholder="RAM" className={GRID_INPUT_CLASS} />
        </div>
        <div className="min-w-0 flex-[1_1_6rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
          <input {...register(`${base}.model`)} placeholder="1500" className={GRID_INPUT_CLASS} />
        </div>
        <div className="min-w-0 flex-[1_1_6rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Trim</label>
          <input
            {...register(`${base}.trim`)}
            placeholder="Night Edition"
            className={GRID_INPUT_CLASS}
          />
        </div>
        <div className="min-w-0 flex-[1_1_6rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Drivetrain</label>
          <input {...register(`${base}.drivetrain`)} placeholder="4WD" className={GRID_INPUT_CLASS} />
        </div>
        <div className="min-w-0 flex-[1_1_5rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
          <input {...register(`${base}.color`)} placeholder="Black" className={GRID_INPUT_CLASS} />
        </div>
        <div className="min-w-0 flex-[1_1_10rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Source URL</label>
          <input
            type="url"
            {...register(`${base}.sourceUrl`)}
            placeholder="https://www.carvana.com/..."
            className={GRID_INPUT_CLASS}
          />
        </div>
        <div className="min-w-0 flex-[1_1_10rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Match Level</label>
          <select {...register(`${base}.matchLevel`)} className={GRID_INPUT_CLASS}>
            {MATCH_LEVEL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2 pl-7">
        <label className="block text-xs font-medium text-slate-600">Comp photo</label>
        <div className="flex flex-wrap items-center gap-3">
          {imageUrl && !thumbBroken ? (
            <img
              src={imageUrl}
              alt=""
              className="h-14 w-20 rounded border border-slate-200 object-cover"
              onError={() => setThumbBroken(true)}
            />
          ) : imageUrl && thumbBroken ? (
            <div className="flex h-14 w-20 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-400">
              Preview unavailable
            </div>
          ) : null}
          <input
            ref={imageInputRef}
            type="file"
            accept={COMP_IMAGE_ACCEPT}
            onChange={handleImageSelect}
            disabled={uploadingImage}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploadingImage}
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
          >
            {uploadingImage ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Uploading…
              </>
            ) : (
              'Upload image'
            )}
          </button>
          {imageUrl ? (
            <button
              type="button"
              onClick={clearImage}
              disabled={uploadingImage}
              className="text-sm font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
            >
              Clear
            </button>
          ) : null}
        </div>
        <p className="text-xs text-slate-400">
          PNG, JPEG, or WebP up to 20MB. Save the listing to persist.
        </p>
        {imageUploadError ? (
          <p className="text-xs text-red-600" role="alert">
            {imageUploadError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2 pl-7">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-600">Factory Differences</label>
          <button
            type="button"
            onClick={appendDifference}
            className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
          >
            <Plus size={14} />
            Add Difference
          </button>
        </div>
        {differences.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Use + for comp upgrades you lack, - for options the comp is missing.
          </p>
        ) : (
          <div className="space-y-2">
            {differences.map((_, diffIndex) => (
              <div key={`${base}-diff-${diffIndex}`} className="flex items-center gap-2">
                <input
                  {...register(`${base}.differences.${diffIndex}`)}
                  placeholder="- Lacks Air Suspension Delete"
                  className={`${GRID_INPUT_CLASS} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeDifference(diffIndex)}
                  className="shrink-0 p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                  aria-label="Remove difference"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3 pl-7">
        <div className="flex flex-wrap items-center gap-3">
          {promotedVehicleId ? (
            <a
              href={`/seller/vehicles/${promotedVehicleId}`}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              Already promoted — open listing
            </a>
          ) : (
            <button
              type="button"
              onClick={handlePromote}
              disabled={promoting || Boolean(blockReason)}
              title={blockReason ?? undefined}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {promoting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Promoting…
                </>
              ) : (
                'Promote to Marketplace'
              )}
            </button>
          )}
          {promotePath ? (
            <a href={promotePath} className="text-sm font-medium text-red-600 hover:text-red-700">
              View public listing →
            </a>
          ) : null}
        </div>
        {blockReason && !promotedVehicleId ? (
          <p className="text-xs text-slate-500">
            {blockReason}. Save the listing after filling fields so promote uses the latest data.
          </p>
        ) : null}
        {promoteError ? (
          <p className="text-xs text-red-600" role="alert">
            {promoteError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
