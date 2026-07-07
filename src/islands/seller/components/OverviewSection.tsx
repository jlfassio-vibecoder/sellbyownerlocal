import AutoTextarea from './AutoTextarea';
import MarkdownTextarea from './MarkdownTextarea';
import PitchBlockEditor from './PitchBlockEditor';
import type { DetailsSectionFormProps } from './form-section-types';
import { INPUT_CLASS_SIMPLE, TEXTAREA_CLASS } from './form-section-types';

const ACCENT_HIGHLIGHT_TIP =
  "Pro tip: Wrap words in double equals to highlight them in your vehicle's accent color (e.g., 2017 RAM 1500 ==Night Edition==).";

export default function OverviewSection({
  register,
  watch,
  setValue,
}: DetailsSectionFormProps) {
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Overview &amp; Seller&apos;s Note</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Subtitle / Tagline</label>
          <input
            type="text"
            {...register('subtitle')}
            className={INPUT_CLASS_SIMPLE}
            placeholder="2017 Ram 1500 Crew Cab Night Edition..."
          />
          <p className="text-xs text-slate-400 mt-2 italic">{ACCENT_HIGHLIGHT_TIP}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Original MSRP</label>
          <input
            type="text"
            {...register('msrp')}
            className={INPUT_CLASS_SIMPLE}
            placeholder="$59,895"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Seller&apos;s Note Intro Paragraphs
          </label>
          <AutoTextarea
            {...register('sellersNoteIntro')}
            className={TEXTAREA_CLASS}
            placeholder="If you are looking for a fully-loaded..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Peace of Mind Guarantee Text
          </label>
          <MarkdownTextarea
            value={watch('peaceOfMindText') ?? ''}
            onChange={(v) => setValue('peaceOfMindText', v, { shouldDirty: true })}
            className={TEXTAREA_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Recent Maintenance Text/List
          </label>
          <MarkdownTextarea
            value={watch('maintenanceText') ?? ''}
            onChange={(v) => setValue('maintenanceText', v, { shouldDirty: true })}
            className={TEXTAREA_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Utility &amp; Towing Text/List
          </label>
          <MarkdownTextarea
            value={watch('utilityTowingText') ?? ''}
            onChange={(v) => setValue('utilityTowingText', v, { shouldDirty: true })}
            className={TEXTAREA_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Luxury Options Text/List</label>
          <MarkdownTextarea
            value={watch('luxuryOptionsText') ?? ''}
            onChange={(v) => setValue('luxuryOptionsText', v, { shouldDirty: true })}
            className={TEXTAREA_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Call to Action Box Text</label>
          <AutoTextarea {...register('ctaText')} className={TEXTAREA_CLASS} />
        </div>

        <PitchBlockEditor watch={watch} setValue={setValue} />
      </div>
    </>
  );
}
