import type { DetailsSectionFormProps } from './form-section-types';
import { INPUT_CLASS } from './form-section-types';

export default function BasicsSection({ register }: DetailsSectionFormProps) {
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Basics</h2>
      <div className="space-y-6">
        <div>
          <label htmlFor="mileage" className="block text-sm font-medium text-slate-700 mb-2">
            Current Mileage
          </label>
          <input
            type="text"
            id="mileage"
            {...register('mileage')}
            className={INPUT_CLASS}
            placeholder="e.g. 78,000"
          />
          <p className="text-xs text-slate-500 mt-2">
            This is displayed in the Seller&apos;s Note section.
          </p>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-2">
            Asking Price
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-slate-500 font-medium">$</span>
            </div>
            <input
              type="text"
              id="price"
              {...register('price')}
              className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all text-slate-900"
              placeholder="e.g. 23,900"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            This is displayed in the Seller&apos;s Note and Market Valuation sections.
          </p>
        </div>
      </div>
    </>
  );
}
