import type { DetailsSectionFormProps } from './form-section-types';
import { INPUT_CLASS } from './form-section-types';
import MonroneyStickerUploadBar from './MonroneyStickerUploadBar';
import MonroneyVinPopulateBar from './MonroneyVinPopulateBar';
import OriginalStickerUploadField from './OriginalStickerUploadField';
import VinPopulateBar from './VinPopulateBar';
import type { VehicleFormState } from '../../../schemas';

interface BasicsSectionProps extends DetailsSectionFormProps {
  vehicleId?: string;
  vehicleVin?: string;
  hasMonroney?: boolean;
  onPopulate?: (state: VehicleFormState) => void;
  onMonroneyUpdated?: () => void;
}

export default function BasicsSection({
  register,
  vehicleId,
  vehicleVin,
  hasMonroney = false,
  watch,
  setValue,
  onPopulate,
  onMonroneyUpdated,
}: BasicsSectionProps) {
  const values = watch();

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Basics</h2>
      {vehicleId && onPopulate ? (
        <VinPopulateBar
          vehicleId={vehicleId}
          currentValues={values}
          onPopulated={(state) => {
            onPopulate(state);
            onMonroneyUpdated?.();
          }}
        />
      ) : null}
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

      {vehicleId ? (
        <div className="mt-8 pt-8 border-t border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Window Sticker</h3>
          <p className="text-xs text-slate-500 mb-4">
            Three ways to work with window stickers: full listing populate via VIN above (Option 1),
            generate only the site sticker from an upload (Option 2), refresh factory specs from VIN
            on existing sticker data (Card B), or show the original factory document on the listing
            (Option 3).
            {hasMonroney
              ? ' Monroney data is on file — preview below after generating or updating.'
              : ' No generated Monroney data yet — use Option 1 or Option 2 to create one.'}
          </p>
          <div className="space-y-4">
            <MonroneyStickerUploadBar
              vehicleId={vehicleId}
              vehicleVin={vehicleVin}
              onMonroneyUpdated={onMonroneyUpdated}
            />
            <MonroneyVinPopulateBar
              vehicleId={vehicleId}
              initialVin={vehicleVin}
              hasMonroney={hasMonroney}
            />
            <OriginalStickerUploadField
              vehicleId={vehicleId}
              windowStickerUrl={values.windowStickerUrl}
              onFieldUpdate={(url) => setValue('windowStickerUrl', url, { shouldDirty: true })}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
