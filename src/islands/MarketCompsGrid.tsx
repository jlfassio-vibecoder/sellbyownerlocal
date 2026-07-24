import { useState } from 'react';
import { Car } from 'lucide-react';
import type { MarketComparable } from '../schemas';
import { mileageFormatter, priceFormatter } from '../utils/formatters';

interface MarketCompsGridProps {
  comps: MarketComparable[];
}

function CompImage({ imageUrl, alt }: { imageUrl?: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(imageUrl) && !broken;

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-slate-100">
      {showImage ? (
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-300">
          <Car size={48} strokeWidth={1.25} aria-hidden="true" />
        </div>
      )}
      <span className="absolute left-2 top-2 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        Dealer Comp
      </span>
    </div>
  );
}

function formatTitle(comp: MarketComparable): string {
  const parts = [comp.year, comp.make, comp.model, comp.trim]
    .map((part) => (part == null || part === '' ? null : String(part).trim()))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Comparable vehicle';
}

export default function MarketCompsGrid({ comps }: MarketCompsGridProps) {
  const visibleComps = comps.filter((comp) => !comp.highlighted);

  if (visibleComps.length === 0) {
    return null;
  }

  return (
    <section className="mb-16 pt-8" aria-labelledby="market-comps-heading">
      <div className="mb-8">
        <h2 id="market-comps-heading" className="mb-2 text-2xl font-bold text-slate-900">
          Market Comparables
        </h2>
        <p className="text-sm text-slate-500">
          External dealer listings for market context and price reference only.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleComps.map((comp, index) => {
          const title = formatTitle(comp);
          const label = comp.label?.trim();

          return (
            <article
              key={`${comp.label}-${comp.price}-${comp.mileage ?? 'na'}-${index}`}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <CompImage imageUrl={comp.imageUrl} alt={title} />

              <div className="space-y-2 p-4">
                {label ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    via {label}
                  </span>
                ) : null}

                <h3 className="text-base font-semibold text-slate-900">{title}</h3>

                <p className="text-lg font-bold text-slate-900">
                  {priceFormatter.format(comp.price)}
                </p>

                {comp.mileage != null ? (
                  <p className="text-sm text-slate-500">
                    {mileageFormatter.format(comp.mileage)} mi
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
