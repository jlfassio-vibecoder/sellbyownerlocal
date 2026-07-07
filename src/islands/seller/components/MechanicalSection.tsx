import MarkdownTextarea from './MarkdownTextarea';
import type { DetailsSectionFormProps } from './form-section-types';
import { GRID_TEXTAREA_CLASS, TEXTAREA_CLASS_SHORT } from './form-section-types';

const MECHANICAL_ITEM_FIELDS = [
  { title: 'mechanicalItem1Title', text: 'mechanicalItem1Text', label: 'Item 1' },
  { title: 'mechanicalItem2Title', text: 'mechanicalItem2Text', label: 'Item 2' },
  { title: 'mechanicalItem3Title', text: 'mechanicalItem3Text', label: 'Item 3' },
] as const;

export default function MechanicalSection({ watch, setValue }: DetailsSectionFormProps) {
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Mechanical Integrity &amp; Upgrades</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Section Intro Text</label>
          <MarkdownTextarea
            value={watch('mechanicalIntegrityIntro') ?? ''}
            onChange={(value) =>
              setValue('mechanicalIntegrityIntro', value, { shouldDirty: true })
            }
            className={TEXTAREA_CLASS_SHORT}
          />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {MECHANICAL_ITEM_FIELDS.map(({ title, text, label }) => (
            <div key={title} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {label} Title
                </label>
                <MarkdownTextarea
                  value={watch(title) ?? ''}
                  onChange={(value) => setValue(title, value, { shouldDirty: true })}
                  className={GRID_TEXTAREA_CLASS}
                  placeholder={`${label} Title`}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{label} Text</label>
                <MarkdownTextarea
                  value={watch(text) ?? ''}
                  onChange={(value) => setValue(text, value, { shouldDirty: true })}
                  className={GRID_TEXTAREA_CLASS}
                  placeholder={`${label} Text`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
