import type { Monroney } from '../schemas';

interface WindowStickerProps {
  monroney: Monroney;
  vehicleTitle: string;
  vin?: string;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function WindowSticker({ monroney, vehicleTitle, vin }: WindowStickerProps) {
  return (
    <div className="border-2 border-black bg-white font-mono text-black">
      <div className="border-b-2 border-black px-4 py-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Manufacturer&apos;s Suggested Retail Price</p>
        <h4 className="mt-1 text-lg font-bold uppercase">{vehicleTitle}</h4>
        {vin ? <p className="mt-1 text-xs">VIN: {vin}</p> : null}
      </div>

      <div className="grid grid-cols-1 border-b-2 border-black md:grid-cols-2">
        <div className="border-black md:border-r-2">
          <div className="border-b border-black px-4 py-2 text-xs font-bold uppercase">Standard Equipment</div>
          <div className="space-y-3 px-4 py-3 text-xs">
            {monroney.standardEquipment.map((group) => (
              <div key={group.category}>
                <p className="mb-1 font-bold uppercase">{group.category}</p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="border-b border-black px-4 py-2 text-xs font-bold uppercase">Options &amp; Packages</div>
          <div className="divide-y divide-black/20">
            <div className="flex items-start justify-between gap-4 px-4 py-2 text-xs">
              <span className="font-bold uppercase">Base MSRP</span>
              <span>{formatPrice(monroney.baseMsrp)}</span>
            </div>
            {monroney.options.map((option) => (
              <div key={`${option.category}-${option.label}`} className="px-4 py-2 text-xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{option.label}</p>
                    <p className="text-[10px] uppercase text-black/60">{option.category}</p>
                    {option.contents && option.contents.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-[11px]">
                        {option.contents.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <span className="shrink-0">{formatPrice(option.price)}</span>
                </div>
              </div>
            ))}
            <div className="flex items-start justify-between gap-4 px-4 py-2 text-xs">
              <span className="font-bold uppercase">Destination Charge</span>
              <span>{formatPrice(monroney.destinationCharge)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 border-t-2 border-black md:grid-cols-[1fr_auto]">
        {monroney.fuelEconomy ? (
          <div className="border-black px-4 py-3 text-xs md:border-r-2">
            <p className="mb-1 font-bold uppercase">EPA Fuel Economy (MPG)</p>
            <p>
              City {monroney.fuelEconomy.city} / Hwy {monroney.fuelEconomy.highway} / Combined{' '}
              {monroney.fuelEconomy.combined}
            </p>
          </div>
        ) : (
          <div className="border-black px-4 py-3 text-xs md:border-r-2">
            {monroney.assembly ? (
              <>
                <p className="mb-1 font-bold uppercase">Assembly</p>
                <p>
                  {monroney.assembly.plant}, {monroney.assembly.country}
                </p>
              </>
            ) : null}
          </div>
        )}

        <div className="px-4 py-3 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider">Total MSRP</p>
          <p className="text-2xl font-bold">{formatPrice(monroney.totalMsrp)}</p>
        </div>
      </div>
    </div>
  );
}
