import AutoTextarea from './AutoTextarea';
import type { DetailsSectionFormProps } from './form-section-types';
import { GRID_INPUT_CLASS, GRID_TEXTAREA_CLASS, TEXTAREA_CLASS_SHORT } from './form-section-types';

export default function MechanicalSection({ register }: DetailsSectionFormProps) {
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Mechanical Integrity &amp; Upgrades</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Section Intro Text</label>
          <AutoTextarea {...register('mechanicalIntegrityIntro')} className={TEXTAREA_CLASS_SHORT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            {...register('mechanicalItem1Title')}
            className={GRID_INPUT_CLASS}
            placeholder="Item 1 Title"
          />
          <AutoTextarea
            {...register('mechanicalItem1Text')}
            className={GRID_TEXTAREA_CLASS}
            placeholder="Item 1 Text"
          />
          <input
            type="text"
            {...register('mechanicalItem2Title')}
            className={GRID_INPUT_CLASS}
            placeholder="Item 2 Title"
          />
          <AutoTextarea
            {...register('mechanicalItem2Text')}
            className={GRID_TEXTAREA_CLASS}
            placeholder="Item 2 Text"
          />
          <input
            type="text"
            {...register('mechanicalItem3Title')}
            className={GRID_INPUT_CLASS}
            placeholder="Item 3 Title"
          />
          <AutoTextarea
            {...register('mechanicalItem3Text')}
            className={GRID_TEXTAREA_CLASS}
            placeholder="Item 3 Text"
          />
        </div>
      </div>
    </>
  );
}
