import { useRef, useState } from 'react';
import { ExternalLink, Loader2, Upload } from 'lucide-react';
import { populateMonroneyFromSticker } from '../../../lib/seller-api';
import { readStickerFileAsDataUri, STICKER_FILE_ACCEPT } from '../../../lib/sticker-file';
import { INPUT_CLASS } from './form-section-types';

interface MonroneyStickerUploadBarProps {
  vehicleId: string;
  vehicleVin?: string;
  onMonroneyUpdated?: () => void;
}

export default function MonroneyStickerUploadBar({
  vehicleId,
  vehicleVin,
  onMonroneyUpdated,
}: MonroneyStickerUploadBarProps) {
  const [vin, setVin] = useState(vehicleVin ?? '');
  const [stickerFile, setStickerFile] = useState<string | undefined>();
  const [stickerFileName, setStickerFileName] = useState<string | null>(null);
  const [stickerError, setStickerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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

  const handleGenerate = async () => {
    if (!stickerFile) {
      setError('Select a window sticker file to upload');
      return;
    }

    setError(null);
    setSuccess(null);
    setNotice(null);
    setLoading(true);

    try {
      const trimmedVin = vin.trim().toUpperCase();
      const result = await populateMonroneyFromSticker(
        vehicleId,
        stickerFile,
        trimmedVin.length === 17 ? trimmedVin : undefined
      );

      if (result.styleLine) {
        setSuccess(`Site sticker generated: ${result.styleLine}`);
      } else {
        setSuccess('Site window sticker generated from upload.');
      }

      if (result.partial && result.message) {
        setNotice(result.message);
      }

      onMonroneyUpdated?.();
      setStickerFile(undefined);
      setStickerFileName(null);
      if (stickerInputRef.current) {
        stickerInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Monroney sticker populate failed', err);
      setError(err instanceof Error ? err.message : 'Failed to generate site sticker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Upload size={16} aria-hidden="true" />
        Generate site sticker from upload
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Upload a factory window sticker (JPEG, PNG, or PDF). AI extracts MSRP, options, and
        standard equipment for the rendered site sticker. Listing copy is not changed.
      </p>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="monroney-sticker-file"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Window sticker file
          </label>
          <input
            id="monroney-sticker-file"
            type="file"
            ref={stickerInputRef}
            accept={STICKER_FILE_ACCEPT}
            onChange={handleStickerSelect}
            disabled={loading}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          {stickerFileName ? (
            <p className="mt-1 text-xs text-slate-500">Selected: {stickerFileName}</p>
          ) : null}
          {stickerError ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {stickerError}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="monroney-sticker-vin"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            VIN (optional — for EPA/safety enrichment)
          </label>
          <input
            id="monroney-sticker-vin"
            type="text"
            value={vin}
            onChange={(event) => setVin(event.target.value.toUpperCase())}
            maxLength={17}
            placeholder="17-character VIN"
            className={`${INPUT_CLASS} font-mono uppercase`}
            disabled={loading}
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !stickerFile}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Generating…
            </>
          ) : (
            'Generate site sticker'
          )}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-2 text-xs text-green-700" role="status">
          {success}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-2 text-xs text-amber-800" role="status">
          {notice}
        </p>
      ) : null}
      <a
        href={`/seller/vehicles/${vehicleId}/preview#build-sheet`}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800"
      >
        Preview window sticker
        <ExternalLink size={12} aria-hidden="true" />
      </a>
    </div>
  );
}
