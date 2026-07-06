import { useRef, useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { generateListingFromVin } from '../../../lib/ai-api';
import { mergeAiFormFields } from '../../../lib/ai/ai-form-merger';
import { readStickerFileAsDataUri, STICKER_FILE_ACCEPT } from '../../../lib/sticker-file';
import { vinString, type VehicleFormState } from '../../../schemas';
import { INPUT_CLASS } from './form-section-types';

interface VinPopulateBarProps {
  vehicleId: string;
  currentValues: VehicleFormState;
  onPopulated: (state: VehicleFormState) => void;
}

function hasExistingContent(values: VehicleFormState): boolean {
  return Boolean(
    values.subtitle?.trim() ||
      values.sellersNoteIntro?.trim() ||
      values.peaceOfMindText?.trim() ||
      values.mechanicalItem1Text?.trim() ||
      values.marketValuation?.contextText?.trim()
  );
}

export default function VinPopulateBar({
  vehicleId,
  currentValues,
  onPopulated,
}: VinPopulateBarProps) {
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stickerFile, setStickerFile] = useState<string | undefined>();
  const [stickerFileName, setStickerFileName] = useState<string | null>(null);
  const [stickerError, setStickerError] = useState<string | null>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);

  const handleStickerSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setStickerFile(undefined);
      setStickerFileName(null);
      setStickerError(null);
      return;
    }

    try {
      const dataUri = await readStickerFileAsDataUri(file);
      setStickerFile(dataUri);
      setStickerFileName(file.name);
      setStickerError(null);
    } catch (err) {
      setStickerFile(undefined);
      setStickerFileName(null);
      setStickerError(err instanceof Error ? err.message : 'Invalid sticker file');
      if (stickerInputRef.current) {
        stickerInputRef.current.value = '';
      }
    }
  };

  const handlePopulate = async () => {
    const trimmedVin = vin.trim().toUpperCase();
    if (!vinString.safeParse(trimmedVin).success) {
      setError('Enter a valid 17-character VIN');
      return;
    }

    if (hasExistingContent(currentValues)) {
      const confirmed = window.confirm(
        'This will overwrite AI-populated fields in your form. Continue?'
      );
      if (!confirmed) return;
    }

    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const result = await generateListingFromVin({
        vin: trimmedVin,
        vehicleId,
        ...(stickerFile ? { stickerFile } : {}),
      });

      onPopulated(mergeAiFormFields(currentValues, result.formFields));
      setVin('');
      setStickerFile(undefined);
      setStickerFileName(null);
      if (stickerInputRef.current) {
        stickerInputRef.current.value = '';
      }

      if (result.partial) {
        setNotice(
          result.message ??
            'Saved available content. Review missing sections in the form instead of regenerating.'
        );
      }
    } catch (err) {
      console.error('VIN populate failed', err);
      setError(err instanceof Error ? err.message : 'Failed to populate from VIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-dashed border-slate-300 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Wand2 size={16} aria-hidden="true" />
        Populate full listing via VIN
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Decode the VIN and generate seller&apos;s note, Monroney MSRP/options, and market sections.
        Upload the original window sticker for accurate standard and optional equipment. Review
        before saving.
      </p>

      <div className="mb-3">
        <label htmlFor="vinPopulateSticker" className="mb-2 block text-xs font-medium text-slate-700">
          Upload Window Sticker (Optional, highly recommended for accurate options)
        </label>
        <input
          ref={stickerInputRef}
          id="vinPopulateSticker"
          type="file"
          accept={STICKER_FILE_ACCEPT}
          onChange={handleStickerSelect}
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        {stickerFileName ? (
          <p className="mt-1 text-xs text-slate-600">Attached: {stickerFileName}</p>
        ) : null}
        {stickerError ? (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {stickerError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={vin}
          onChange={(event) => setVin(event.target.value.toUpperCase())}
          maxLength={17}
          placeholder="17-character VIN"
          className={`${INPUT_CLASS} font-mono uppercase`}
          disabled={loading}
          aria-label="VIN for AI population"
        />
        <button
          type="button"
          onClick={handlePopulate}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Generating…
            </>
          ) : (
            'Populate'
          )}
        </button>
      </div>
      {notice ? (
        <p className="mt-2 text-xs text-amber-700" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
