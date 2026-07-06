import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AiApiError, generateHighlights } from '../../../lib/ai-api';
import type { VehicleFormState } from '../../../schemas';
import AutoTextarea from './AutoTextarea';
import type { DetailsSectionFormProps } from './form-section-types';
import { GRID_INPUT_CLASS, GRID_TEXTAREA_CLASS } from './form-section-types';

const HIGHLIGHT_FIELD_KEYS = [
  ['highlight1Title', 'highlight1Text'],
  ['highlight2Title', 'highlight2Text'],
  ['highlight3Title', 'highlight3Text'],
  ['highlight4Title', 'highlight4Text'],
] as const satisfies ReadonlyArray<
  readonly [keyof VehicleFormState, keyof VehicleFormState]
>;

interface HighlightsSectionProps extends DetailsSectionFormProps {
  vehicleId: string;
}

export default function HighlightsSection({
  vehicleId,
  register,
  setValue,
}: HighlightsSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerateError(null);
    setIsGenerating(true);

    try {
      const result = await generateHighlights(vehicleId);

      result.highlights.forEach((highlight, index) => {
        const [titleKey, textKey] = HIGHLIGHT_FIELD_KEYS[index]!;
        setValue(titleKey, highlight.title, { shouldDirty: true });
        setValue(textKey, highlight.text, { shouldDirty: true });
      });
    } catch (err) {
      console.error('Highlights generation failed', err);
      if (err instanceof AiApiError) {
        setGenerateError(err.message);
      } else {
        setGenerateError('Failed to auto-generate highlights. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Vehicle Highlights &amp; Utility</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6">
        <p className="text-sm text-slate-600 mb-3">
          Uses saved Monroney and market research data. Save listing changes before generating.
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <span aria-hidden="true">✨</span>
          )}
          Auto-Generate Highlights (AI)
        </button>
        {generateError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {generateError}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          {...register('highlight1Title')}
          className={GRID_INPUT_CLASS}
          placeholder="Highlight 1 Title"
        />
        <AutoTextarea
          {...register('highlight1Text')}
          className={GRID_TEXTAREA_CLASS}
          placeholder="Highlight 1 Text"
        />
        <input
          type="text"
          {...register('highlight2Title')}
          className={GRID_INPUT_CLASS}
          placeholder="Highlight 2 Title"
        />
        <AutoTextarea
          {...register('highlight2Text')}
          className={GRID_TEXTAREA_CLASS}
          placeholder="Highlight 2 Text"
        />
        <input
          type="text"
          {...register('highlight3Title')}
          className={GRID_INPUT_CLASS}
          placeholder="Highlight 3 Title"
        />
        <AutoTextarea
          {...register('highlight3Text')}
          className={GRID_TEXTAREA_CLASS}
          placeholder="Highlight 3 Text"
        />
        <input
          type="text"
          {...register('highlight4Title')}
          className={GRID_INPUT_CLASS}
          placeholder="Highlight 4 Title"
        />
        <AutoTextarea
          {...register('highlight4Text')}
          className={GRID_TEXTAREA_CLASS}
          placeholder="Highlight 4 Text"
        />
      </div>
    </>
  );
}
