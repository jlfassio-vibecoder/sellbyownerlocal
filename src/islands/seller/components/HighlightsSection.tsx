import AutoTextarea from './AutoTextarea';
import type { DetailsSectionFormProps } from './form-section-types';
import { GRID_INPUT_CLASS, GRID_TEXTAREA_CLASS } from './form-section-types';

export default function HighlightsSection({ register }: DetailsSectionFormProps) {
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Vehicle Highlights &amp; Utility</h2>
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
