import { GripVertical, Trash2 } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';
import type { VehicleFormState } from '../../../schemas';
import { GRID_INPUT_CLASS } from './form-section-types';

interface ComparableRowProps {
  index: number;
  register: UseFormRegister<VehicleFormState>;
  draggingIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  onRemove: (index: number) => void;
}

export default function ComparableRow({
  index,
  register,
  draggingIndex,
  dragOverIndex,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onRemove,
}: ComparableRowProps) {
  const base = `marketValuation.comparables.${index}` as const;

  return (
    <div
      onDragEnter={() => onDragEnter(index)}
      onDragOver={(e) => e.preventDefault()}
      className={`space-y-3 p-4 bg-white border rounded-lg transition-colors ${
        draggingIndex === index ? 'opacity-50' : ''
      } ${
        dragOverIndex === index && draggingIndex !== null && draggingIndex !== index
          ? 'border-red-400 ring-1 ring-red-400'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div
          draggable
          onDragStart={() => onDragStart(index)}
          onDragEnd={onDragEnd}
          className="flex shrink-0 items-center self-stretch cursor-grab active:cursor-grabbing pb-2 text-slate-400 hover:text-slate-600 touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical size={18} />
        </div>
        <div className="min-w-0 flex-[1_1_10rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Label / Source</label>
          <input
            {...register(`${base}.label`)}
            placeholder="Dealer"
            className={GRID_INPUT_CLASS}
          />
        </div>
        <div className="min-w-0 flex-[0_1_7rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Price</label>
          <input
            type="number"
            {...register(`${base}.price`, { valueAsNumber: true })}
            placeholder="24500"
            className={GRID_INPUT_CLASS}
          />
        </div>
        <div className="min-w-0 flex-[0_1_6rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Mileage</label>
          <input
            type="number"
            {...register(`${base}.mileage`, { valueAsNumber: true })}
            placeholder="98000"
            className={GRID_INPUT_CLASS}
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="shrink-0 p-2 text-slate-400 hover:text-red-600 transition-colors"
          aria-label="Remove comparable"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 pl-7">
        <div className="min-w-0 flex-[0_1_5rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
          <input
            type="number"
            {...register(`${base}.year`, { valueAsNumber: true })}
            placeholder="2017"
            className={GRID_INPUT_CLASS}
          />
        </div>
        <div className="min-w-0 flex-[1_1_6rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Make</label>
          <input {...register(`${base}.make`)} placeholder="RAM" className={GRID_INPUT_CLASS} />
        </div>
        <div className="min-w-0 flex-[1_1_6rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
          <input {...register(`${base}.model`)} placeholder="1500" className={GRID_INPUT_CLASS} />
        </div>
        <div className="min-w-0 flex-[1_1_6rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Trim</label>
          <input
            {...register(`${base}.trim`)}
            placeholder="Night Edition"
            className={GRID_INPUT_CLASS}
          />
        </div>
        <div className="min-w-0 flex-[1_1_6rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Drivetrain</label>
          <input {...register(`${base}.drivetrain`)} placeholder="4WD" className={GRID_INPUT_CLASS} />
        </div>
        <div className="min-w-0 flex-[1_1_5rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
          <input {...register(`${base}.color`)} placeholder="Black" className={GRID_INPUT_CLASS} />
        </div>
        <div className="min-w-0 flex-[1_1_10rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Source URL</label>
          <input
            type="url"
            {...register(`${base}.sourceUrl`)}
            placeholder="https://www.carvana.com/..."
            className={GRID_INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  );
}
