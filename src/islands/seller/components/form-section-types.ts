import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import type { VehicleFormState } from '../../../schemas';

export interface DetailsSectionFormProps {
  register: UseFormRegister<VehicleFormState>;
  control: Control<VehicleFormState>;
  errors: FieldErrors<VehicleFormState>;
  setValue: UseFormSetValue<VehicleFormState>;
  watch: UseFormWatch<VehicleFormState>;
}

export const INPUT_CLASS =
  'w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all text-slate-900';

export const INPUT_CLASS_SIMPLE =
  'w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900';

export const TEXTAREA_CLASS =
  'w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[100px]';

export const TEXTAREA_CLASS_SHORT =
  'w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-slate-900 min-h-[80px]';

export const GRID_INPUT_CLASS =
  'w-full min-w-0 box-border px-4 py-2 border border-slate-300 rounded-lg text-slate-900';

export const GRID_TEXTAREA_CLASS =
  'px-4 py-2 border border-slate-300 rounded-lg min-h-[60px] text-slate-900';
