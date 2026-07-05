import { useRef, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Plus } from 'lucide-react';
import AutoTextarea from './AutoTextarea';
import ComparableRow from './ComparableRow';
import type { DetailsSectionFormProps } from './form-section-types';
import { TEXTAREA_CLASS_SHORT } from './form-section-types';

const TEXT_FIELDS = [
  {
    name: 'marketValuation.contextText' as const,
    label: 'Context Intro',
    helper: 'Intro paragraph under the "Market Valuation Context" heading on the public listing.',
  },
  {
    name: 'marketValuation.dealerRealityText' as const,
    label: 'Dealer Retail Reality',
    helper: 'Text shown in the "Dealer Retail Reality" sidebar card.',
  },
  {
    name: 'marketValuation.kbbText' as const,
    label: 'KBB Private Party Value',
    helper: 'Text shown in the "KBB Private Party Value" sidebar card.',
  },
  {
    name: 'marketValuation.justificationText' as const,
    label: 'This Listing',
    helper: 'Text shown in the dark "This Listing" sidebar card.',
  },
];

export default function MarketValuationSection({ register, control }: DetailsSectionFormProps) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'marketValuation.comparables',
  });

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) {
      dragItem.current = null;
      dragOverItem.current = null;
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }

    const from = dragItem.current;
    const to = dragOverItem.current;

    if (from !== to) {
      move(from, to);
    }

    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Market Valuation Context</h2>

      <div className="space-y-6">
        {TEXT_FIELDS.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
            <p className="text-xs text-slate-500 mb-2">{field.helper}</p>
            <AutoTextarea {...register(field.name)} className={TEXTAREA_CLASS_SHORT} />
          </div>
        ))}

        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-slate-700">Comparable Vehicles</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Up to 5 dealer listings shown in the pricing comparison chart. Drag to reorder the
                default view. Optional specs, exterior color, and source URL enrich chart
                labels. Source URLs are stored for your records but not linked on the public
                listing. Your listing price and mileage are added automatically.
              </p>
            </div>
            <button
              type="button"
              disabled={fields.length >= 5}
              onClick={() => append({ label: '', price: 0 })}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Add Comparable Vehicle
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-lg">
              No comparables added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <ComparableRow
                  key={field.id}
                  index={index}
                  register={register}
                  draggingIndex={draggingIndex}
                  dragOverIndex={dragOverIndex}
                  onDragStart={(i) => {
                    dragItem.current = i;
                    setDraggingIndex(i);
                  }}
                  onDragEnter={(i) => {
                    dragOverItem.current = i;
                    setDragOverIndex(i);
                  }}
                  onDragEnd={handleDragEnd}
                  onRemove={remove}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
