import AutoTextarea from './AutoTextarea';
import type { DetailsSectionFormProps } from './form-section-types';
import { INPUT_CLASS_SIMPLE, TEXTAREA_CLASS } from './form-section-types';

export default function OverviewSection({ register }: DetailsSectionFormProps) {
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
          <AutoTextarea {...register('peaceOfMindText')} className={TEXTAREA_CLASS} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Recent Maintenance Text/List
          </label>
          <AutoTextarea {...register('maintenanceText')} className={TEXTAREA_CLASS} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Utility &amp; Towing Text/List
          </label>
          <AutoTextarea {...register('utilityTowingText')} className={TEXTAREA_CLASS} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Luxury Options Text/List</label>
          <AutoTextarea {...register('luxuryOptionsText')} className={TEXTAREA_CLASS} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Call to Action Box Text</label>
          <AutoTextarea {...register('ctaText')} className={TEXTAREA_CLASS} />
        </div>
      </div>
    </>
  );
}
