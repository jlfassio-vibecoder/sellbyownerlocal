import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { populateMonroneyFromVin } from '../../../lib/seller-api';
import { INPUT_CLASS } from './form-section-types';

interface MonroneyVinPopulateBarProps {
  vehicleId: string;
  initialVin?: string;
  hasMonroney: boolean;
}

export default function MonroneyVinPopulateBar({
  vehicleId,
  initialVin,
  hasMonroney,
}: MonroneyVinPopulateBarProps) {
  const [vin, setVin] = useState(initialVin ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (initialVin) {
      setVin(initialVin);
    }
  }, [initialVin]);

  const handleUpdate = async () => {
    const trimmedVin = vin.trim().toUpperCase();
    if (trimmedVin.length !== 17) {
      setError('Enter a valid 17-character VIN');
      return;
    }

    setError(null);
    setSuccess(null);
    setInfo(null);
    setLoading(true);

    try {
      const result = await populateMonroneyFromVin(vehicleId, trimmedVin);

      if (result.enriched && result.styleLine) {
        setSuccess(`Window sticker updated: ${result.styleLine}`);
      } else if (result.needsFullPopulate && result.factoryPreview) {
        setInfo(
          `VIN saved. Factory style preview: ${result.factoryPreview.styleLine}. Run Populate full listing via VIN above for MSRP, options, and standard equipment.`
        );
      } else if (result.message) {
        setInfo(result.message);
      }
    } catch (err) {
      console.error('Monroney VIN populate failed', err);
      setError(err instanceof Error ? err.message : 'Failed to update window sticker from VIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <FileText size={16} aria-hidden="true" />
        Update factory specs from VIN
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Refreshes factory style line, EPA, safety ratings, and assembly from NHTSA vPIC when you
        already have Monroney MSRP, options, and standard equipment on file. Does not change listing
        copy or re-extract equipment from a sticker upload.
        {!hasMonroney ? (
          <>
            {' '}
            Run Option 1 or Option 2 first to populate MSRP and equipment.
          </>
        ) : null}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={vin}
          onChange={(event) => setVin(event.target.value.toUpperCase())}
          maxLength={17}
          placeholder="17-character VIN"
          className={`${INPUT_CLASS} font-mono uppercase`}
          disabled={loading}
          aria-label="VIN for window sticker update"
        />
        <button
          type="button"
          onClick={handleUpdate}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Updating…
            </>
          ) : (
            'Update window sticker'
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
      {info ? (
        <p className="mt-2 text-xs text-amber-800" role="status">
          {info}
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
