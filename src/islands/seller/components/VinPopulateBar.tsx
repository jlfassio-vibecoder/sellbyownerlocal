import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { generateListingFromVin } from '../../../lib/ai-api';
import { mergeAiFormFields } from '../../../lib/ai/ai-output-mapper';
import type { VehicleFormState } from '../../../schemas';
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

  const handlePopulate = async () => {
    const trimmedVin = vin.trim().toUpperCase();
    if (trimmedVin.length !== 17) {
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
    setLoading(true);

    try {
      const result = await generateListingFromVin({
        vin: trimmedVin,
        vehicleId,
      });

      onPopulated(mergeAiFormFields(currentValues, result.formFields));
      setVin('');
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
        Populate via VIN
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Decode the VIN and fill listing copy, Monroney data, and market sections. Review before
        saving.
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
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
