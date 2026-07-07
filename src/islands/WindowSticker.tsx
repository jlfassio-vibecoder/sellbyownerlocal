/** @warning DO NOT add client directives (e.g., client:load) to this component. It relies on @xmldom/xmldom which will break/bloat the client bundle. SSR ONLY. */
import type { Monroney, VehicleSpecs } from '../schemas';
import { generateVinBarcodeSvg } from '../lib/generate-vin-barcode-svg';
import { buildBaseModelLine, US_REQUIREMENTS_DISCLAIMER } from '../lib/monroney-style-line';

interface WindowStickerProps {
  monroney: Monroney;
  vehicleTitle: string;
  make: string;
  model: string;
  vin?: string;
  trim?: string;
  styleLine?: string;
  year?: number;
  specs?: VehicleSpecs;
}

const MSRP_DISCLAIMER =
  "MANUFACTURER'S SUGGESTED RETAIL PRICE OF THIS MODEL INCLUDING DEALER PREPARATION";

const FEDERAL_DISCLAIMER =
  'THIS LABEL IS ADDED TO THIS VEHICLE TO COMPLY WITH FEDERAL LAW. THE LABEL CANNOT BE REMOVED OR ALTERED PRIOR TO DELIVERY TO THE ULTIMATE PURCHASER. * STATE AND/OR LOCAL TAXES IF ANY, LICENSE AND TITLE FEES AND DEALER SUPPLIED AND INSTALLED OPTIONS AND ACCESSORIES ARE NOT INCLUDED IN THIS PRICE. DISCOUNT, IF ANY, IS BASED ON PRICE OF OPTIONS IF PURCHASED SEPARATELY.';

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatVinDisplay(vin: string): string {
  const normalized = vin.replace(/-/g, '').toUpperCase();
  if (normalized.length !== 17) return vin.toUpperCase();
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 11)}-${normalized.slice(11)}`;
}

function normalizeVin(vin: string): string {
  return vin.replace(/-/g, '').toUpperCase();
}

function ArrowedPriceBox({
  label,
  price,
  large = false,
}: {
  label: string;
  price: number;
  large?: boolean;
}) {
  const capSize = large ? 'border-y-[12px]' : 'border-y-[10px]';
  const capWidth = large ? 'border-l-[16px]' : 'border-l-[14px]';

  return (
    <div className="my-1 border-y-2 border-black py-0.5">
      <div className="flex items-center justify-between gap-1 px-0">
        <span
          className={`inline-block h-0 w-0 shrink-0 ${capSize} border-y-transparent ${capWidth} border-l-black`}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2 px-1">
          <span
            className={`font-bold uppercase tracking-tighter ${large ? 'text-sm' : 'text-[10px]'}`}
          >
            {label}
          </span>
          <span
            className={`shrink-0 font-bold tabular-nums tracking-tighter ${large ? 'text-xl' : 'text-sm'}`}
          >
            {formatPrice(price)}
          </span>
        </div>
        <span
          className={`inline-block h-0 w-0 shrink-0 ${capSize} border-y-transparent border-r-black ${capWidth.replace('border-l-', 'border-r-')}`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function RatingBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  return (
    <div className="mt-1">
      <p className="text-[7px] font-bold uppercase leading-tight tracking-tighter">{label}</p>
      <div className="mt-0.5 flex items-center gap-0.5">
        {Array.from({ length: max }, (_, index) => (
          <span
            key={`${label}-${index}`}
            className={`inline-block h-2 w-2 rounded-full border border-black ${
              index < value ? 'bg-black' : 'bg-white'
            }`}
          />
        ))}
        <span className="ml-1 text-[7px] font-bold">{value}</span>
      </div>
    </div>
  );
}

function StarRow({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[8px] leading-tight tracking-tighter">
      <span>{label}</span>
      {value != null && value >= 1 && value <= 5 ? (
        <span className="shrink-0 tracking-tight">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={`${label}-${index}`}>{index < value ? '★' : '☆'}</span>
          ))}
        </span>
      ) : (
        <span className="shrink-0 font-bold uppercase">Not Rated</span>
      )}
    </div>
  );
}

function EpaBox({ monroney }: { monroney: Monroney }) {
  const epa = monroney.epa;
  const fuelEconomy = monroney.fuelEconomy;
  const mpg = epa ?? fuelEconomy;
  const spendMore =
    epa?.fiveYearSavings !== undefined && epa.fiveYearSavings < 0
      ? Math.abs(epa.fiveYearSavings)
      : undefined;

  return (
    <div className="border-2 border-black">
      <div className="relative bg-black px-2 py-1">
        {epa?.fuelType ? (
          <span className="absolute right-1 top-1 border border-white px-1 text-[7px] font-bold uppercase text-white">
            {epa.fuelType}
          </span>
        ) : null}
        <p className="pr-16 text-[9px] font-bold uppercase leading-tight tracking-tighter text-white">
          EPA DOT Fuel Economy and Environment
        </p>
      </div>

      <div className="p-2">
        <p className="text-[8px] leading-tight tracking-tighter">
          These estimates reflect new EPA methods beginning with 2017 models.
        </p>

        {mpg ? (
          <>
            <div className="mt-2 flex items-end justify-center gap-3 text-center">
              <div>
                <p className="text-lg font-bold leading-none tracking-tighter">{mpg.city}</p>
                <p className="text-[8px] uppercase tracking-tighter">city</p>
              </div>
              <div>
                <p className="text-4xl font-bold leading-none tracking-tighter">{mpg.combined}</p>
                <p className="text-[8px] font-bold uppercase tracking-tighter">MPG</p>
                <p className="text-[8px] uppercase tracking-tighter">combined city/hwy</p>
              </div>
              <div>
                <p className="text-lg font-bold leading-none tracking-tighter">{mpg.highway}</p>
                <p className="text-[8px] uppercase tracking-tighter">highway</p>
              </div>
            </div>

            {epa?.gallonsPer100Mi ? (
              <p className="mt-2 text-center text-[8px] tracking-tighter">
                {epa.gallonsPer100Mi} gallons per 100 miles
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-2 py-4 text-center text-[10px] font-bold tracking-tighter">—</div>
        )}

        <div className="mt-2 border-2 border-black p-1 text-center">
          <p className="text-[7px] font-bold uppercase tracking-tighter">Annual fuel COST</p>
          {epa?.annualFuelCost ? (
            <p className="text-lg font-bold tracking-tighter">
              ${epa.annualFuelCost.toLocaleString('en-US')}
            </p>
          ) : (
            <p className="text-lg font-bold tracking-tighter">—</p>
          )}
        </div>

        {spendMore ? (
          <p className="mt-2 border border-black p-1 text-[7px] leading-snug tracking-tighter">
            You spend ${spendMore.toLocaleString('en-US')} more in fuel costs over 5 years compared
            to the average new vehicle.
          </p>
        ) : null}

        {epa?.ghgRating ? (
          <RatingBar label="Fuel Economy & Greenhouse Gas Rating (tailpipe only)" value={epa.ghgRating} />
        ) : null}
        {epa?.smogRating ? (
          <RatingBar label="Smog Rating (tailpipe only)" value={epa.smogRating} />
        ) : null}

        {epa?.co2GramsPerMile ? (
          <p className="mt-1 text-[7px] leading-snug tracking-tighter">
            This vehicle emits {epa.co2GramsPerMile} grams CO2 per mile. The best emits 0 grams per
            mile (tailpipe only). Results will vary.
          </p>
        ) : null}

        <p className="mt-1 text-[7px] leading-snug tracking-tighter">
          Actual results will vary for many reasons, including driving conditions and how you drive
          and maintain your vehicle.
        </p>
        <p className="text-[7px] leading-snug tracking-tighter">
          fueleconomy.gov — Calculate personalized estimates and compare vehicles
        </p>
      </div>
    </div>
  );
}

function SafetyBox({ monroney }: { monroney: Monroney }) {
  const ratings = monroney.safetyRatings;

  return (
    <div className="border-2 border-black">
      <div className="bg-black px-2 py-1">
        <p className="text-[9px] font-bold uppercase leading-tight tracking-tighter text-white">
          Government 5-Star Safety Ratings
        </p>
      </div>
      <div className="space-y-0.5 p-2">
        <StarRow label="Overall Vehicle Score" value={ratings?.overall} />
        <p className="mt-1 text-[8px] font-bold uppercase tracking-tighter">Frontal Crash</p>
        <StarRow label="Driver" value={ratings?.frontalDriver} />
        <StarRow label="Passenger" value={ratings?.frontalPassenger} />
        <p className="mt-1 text-[8px] font-bold uppercase tracking-tighter">Side Crash</p>
        <StarRow label="Front seat" value={ratings?.sideFrontSeat} />
        <StarRow label="Rear seat" value={ratings?.sideRearSeat} />
        <StarRow label="Rollover" value={ratings?.rollover} />
        <p className="mt-1 text-[7px] leading-snug tracking-tighter">
          Star ratings range from 1 to 5 stars (★★★★★) with 5 being the highest. Overall Safety
          Rating (Frontal Crash, Side Crash, and Rollover) — safercar.gov or 1-888-327-4236
        </p>
      </div>
    </div>
  );
}

function PartsContentBox({ monroney }: { monroney: Monroney }) {
  const parts = monroney.partsContent;
  const assembly = monroney.assembly;

  return (
    <div className="border-2 border-black">
      <div className="bg-black px-2 py-1">
        <p className="text-[9px] font-bold uppercase leading-tight tracking-tighter text-white">
          Parts Content Information
        </p>
      </div>
      <div className="space-y-0.5 p-2 text-[8px] leading-tight tracking-tighter">
        <p>
          U.S./Canadian Parts Content:{' '}
          {parts?.usCanadianPercent !== undefined ? `${parts.usCanadianPercent}%` : 'N/A'}
        </p>
        {parts?.majorForeignSources?.length ? (
          parts.majorForeignSources.map((source) => (
            <p key={source.country}>
              Major Sources of Foreign Parts Content: {source.country} {source.percent}%
            </p>
          ))
        ) : (
          <p>Major Sources of Foreign Parts Content: N/A</p>
        )}
        {assembly ? (
          <p>
            Final Assembly Point: {assembly.plant.toUpperCase()}, {assembly.country.toUpperCase()}
          </p>
        ) : (
          <p>Final Assembly Point: N/A</p>
        )}
        <p>
          Country of Origin: Engine: {parts?.engineOrigin ?? 'N/A'}
        </p>
        <p>Transmission: {parts?.transmissionOrigin ?? 'N/A'}</p>
      </div>
    </div>
  );
}

const GENERATED_STICKER_DISCLAIMER =
  "DISCLAIMER: This is a digitally reproduced representation of the vehicle's equipment based on available market and VIN data. It is not an official OEM Monroney label and may contain inaccuracies.";

export default function WindowSticker({
  monroney,
  vehicleTitle,
  make,
  model,
  vin,
  trim,
  styleLine,
  year,
  specs,
}: WindowStickerProps) {
  const headerStyleLine = styleLine ?? trim ?? vehicleTitle;
  const baseModelLine = buildBaseModelLine({ make, model, factorySpecs: monroney.factorySpecs });
  const normalizedVin = vin ? normalizeVin(vin) : undefined;
  const vinBarcodeSvg = normalizedVin ? generateVinBarcodeSvg(normalizedVin) : undefined;
  const showFederalFooter = Boolean(vin || monroney.assembly);
  const manufacturer = monroney.manufacturerInfo;

  return (
    <div className="border-[6px] border-black bg-white font-sans text-[10px] leading-tight tracking-tighter text-black">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b-[3px] border-black px-3 py-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          {year ? (
            <p className="text-xs font-bold uppercase italic tracking-tighter">{year} Model Year</p>
          ) : null}
          <p className="text-sm font-bold uppercase italic leading-tight tracking-tighter md:text-base">
            {headerStyleLine}
          </p>
          <p className="mt-1 text-[9px] font-bold uppercase leading-snug tracking-tighter">
            {US_REQUIREMENTS_DISCLAIMER}
          </p>
        </div>
        {manufacturer ? (
          <div className="max-w-xs shrink-0 text-right text-[8px] leading-snug tracking-tighter">
            <p className="font-bold uppercase">{manufacturer.name}</p>
            {manufacturer.website || manufacturer.phone ? (
              <p className="mt-1 uppercase">
                For more information visit:
                {manufacturer.website ? ` ${manufacturer.website}` : ''}
                {manufacturer.phone ? ` or call ${manufacturer.phone}` : ''}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 3-column body */}
      <div className="grid grid-cols-1 divide-y-[3px] divide-black md:grid-cols-3 md:divide-x-[3px] md:divide-y-0">
        {/* Column 1 */}
        <div className="min-w-0">
          <div className="space-y-0.5 border-b border-black px-3 py-2">
            <p className="text-[8px] font-bold uppercase leading-snug tracking-tighter">
              {MSRP_DISCLAIMER}
            </p>
            <ArrowedPriceBox label="Base Price:" price={monroney.baseMsrp} />
            <p className="font-bold uppercase tracking-tighter">{baseModelLine}</p>
            {specs ? (
              <>
                <p>
                  <span className="font-semibold">Exterior Color:</span> {specs.exteriorColor}
                </p>
                <p>
                  <span className="font-semibold">Interior Color:</span> {specs.interiorColor}
                </p>
                <p>
                  <span className="font-semibold">Engine:</span> {specs.engine}
                </p>
                <p>
                  <span className="font-semibold">Transmission:</span> {specs.transmission}
                </p>
              </>
            ) : null}
          </div>

          <div className="border-b border-black px-3 py-1.5 text-sm font-bold uppercase tracking-tighter">
            Standard Equipment (Unless Replaced by Optional Equipment)
          </div>
          <div className="space-y-2 px-3 py-2">
            {monroney.standardEquipment.map((group) => (
              <div key={group.category}>
                <p className="font-bold uppercase tracking-tighter">{group.category}</p>
                {group.items.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 */}
        <div className="flex min-w-0 flex-col">
          <div className="border-b border-black px-3 py-1.5 text-sm font-bold uppercase tracking-tighter">
            Optional Equipment (May Replace Standard Equipment)
          </div>
          <div className="flex-1 space-y-1 px-3 py-2">
            {monroney.options.map((option) => (
              <div key={`${option.category}-${option.label}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1">{option.label}</span>
                  <span className="shrink-0 tabular-nums">{formatPrice(option.price)}</span>
                </div>
                {option.contents?.map((item) => (
                  <p key={item} className="pl-3">
                    {item}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-auto border-t border-black px-3 py-2">
            <div className="flex items-baseline justify-between gap-2 font-bold uppercase tracking-tighter">
              <span>Destination Charge</span>
              <span className="tabular-nums">{formatPrice(monroney.destinationCharge)}</span>
            </div>
            <ArrowedPriceBox label="Total Price: *" price={monroney.totalMsrp} large />

            {monroney.warranty ? (
              <div className="mt-2 border-t border-black pt-2">
                <p className="text-[9px] font-bold uppercase tracking-tighter">Warranty Coverage</p>
                {monroney.warranty.items.map((item) => (
                  <p key={item} className="text-[8px] leading-snug tracking-tighter">
                    {item}
                  </p>
                ))}
                {monroney.warranty.badge ? (
                  <div className="mt-2 border-2 border-black px-2 py-1 text-center text-[8px] font-bold uppercase leading-tight tracking-tighter">
                    {monroney.warranty.badge}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Column 3 — federal boxes always rendered */}
        <div className="min-w-0 space-y-2 px-3 py-2">
          <EpaBox monroney={monroney} />
          <SafetyBox monroney={monroney} />
          <PartsContentBox monroney={monroney} />
        </div>
      </div>

      {/* Federal footer */}
      {showFederalFooter ? (
        <div className="border-t-[3px] border-black px-3 py-2">
          {monroney.assembly ? (
            <p className="text-[9px] uppercase leading-tight tracking-tighter">
              {'Assembly Point/Port of Entry: '}
              {monroney.assembly.plant.toUpperCase()}, {monroney.assembly.country.toUpperCase()}
            </p>
          ) : null}

          <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
            {normalizedVin ? (
              <div className="shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-tighter">
                  VIN: {formatVinDisplay(normalizedVin)}
                </p>
                {vinBarcodeSvg ? (
                  <div
                    className="max-w-full overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: vinBarcodeSvg }}
                  />
                ) : null}
              </div>
            ) : null}

            <p className="max-w-lg text-[9px] leading-tight tracking-tighter text-gray-800 uppercase">
              {FEDERAL_DISCLAIMER}
            </p>
          </div>
        </div>
      ) : null}

      <p className="border-t border-black px-3 py-2 text-[8px] normal-case leading-snug text-gray-500">
        {GENERATED_STICKER_DISCLAIMER}
      </p>
    </div>
  );
}
