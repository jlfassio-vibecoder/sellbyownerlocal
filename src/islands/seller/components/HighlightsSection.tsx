import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AiApiError, generateHighlights } from '../../../lib/ai-api';
import type { VehicleFormState } from '../../../schemas';
import MarkdownTextarea from './MarkdownTextarea';
import type { DetailsSectionFormProps } from './form-section-types';
import { GRID_TEXTAREA_CLASS } from './form-section-types';

const HIGHLIGHT_FIELDS = [
  { title: 'highlight1Title', text: 'highlight1Text', label: 'Highlight 1' },
  { title: 'highlight2Title', text: 'highlight2Text', label: 'Highlight 2' },
  { title: 'highlight3Title', text: 'highlight3Text', label: 'Highlight 3' },
  { title: 'highlight4Title', text: 'highlight4Text', label: 'Highlight 4' },
] as const satisfies ReadonlyArray<{
  title: keyof VehicleFormState;
  text: keyof VehicleFormState;
  label: string;
}>;

interface HighlightsSectionProps extends DetailsSectionFormProps {
  vehicleId: string;
}

export default function HighlightsSection({
  vehicleId,
  watch,
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
        const field = HIGHLIGHT_FIELDS[index];
        if (!field) return;
        setValue(field.title, highlight.title, { shouldDirty: true });
        setValue(field.text, highlight.text, { shouldDirty: true });
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {HIGHLIGHT_FIELDS.map(({ title, text, label }) => (
          <div key={title} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{label} Title</label>
              <MarkdownTextarea
                id={title}
                value={(watch(title) as string | undefined) ?? ''}
                onChange={(value) => setValue(title, value, { shouldDirty: true })}
                className={GRID_TEXTAREA_CLASS}
                placeholder={`${label} Title`}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{label} Text</label>
              <MarkdownTextarea
                id={text}
                value={(watch(text) as string | undefined) ?? ''}
                onChange={(value) => setValue(text, value, { shouldDirty: true })}
                className={GRID_TEXTAREA_CLASS}
                placeholder={`${label} Text`}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
