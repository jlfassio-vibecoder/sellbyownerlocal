import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MarketComparable, MarketValuation } from '../schemas';

interface MarketChartProps {
  price: number;
  mileage: number;
  valuation: MarketValuation;
}

type SortMode = 'default' | 'price' | 'mileage';

type ChartBar = {
  name: string;
  value: number;
  mileage: number;
  fill: string;
  sourceHost?: string;
};

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'default', label: 'Default' },
  { mode: 'price', label: 'Price' },
  { mode: 'mileage', label: 'Mileage' },
];

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const mileageFormatter = new Intl.NumberFormat('en-US');

function formatMileageShort(mileage: number): string {
  if (mileage >= 1000) {
    const thousands = mileage / 1000;
    return Number.isInteger(thousands) ? `${thousands}k` : `${thousands.toFixed(1)}k`;
  }
  return mileageFormatter.format(mileage);
}

function formatComparableLabel(c: MarketComparable): string {
  const base = c.label.trim() || 'Dealer';
  const spec = [c.year, c.make, c.model, c.trim, c.drivetrain]
    .filter((v) => v != null && String(v).trim() !== '')
    .join(' ');
  let name = spec ? `${base} - ${spec}` : base;
  if (c.color?.trim()) {
    name += ` - ${c.color.trim()}`;
  }
  const mileageSuffix =
    c.mileage != null && Number.isFinite(c.mileage)
      ? ` (${formatMileageShort(c.mileage)} mi)`
      : '';
  return name + mileageSuffix;
}

function parseSourceHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function ChartTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartBar }>;
}) {
  if (!active || !payload?.length) return null;
  const bar = payload[0]?.payload;
  if (!bar) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-slate-900">{bar.name}</p>
      <p className="text-slate-600">${bar.value.toLocaleString()}</p>
      {bar.sourceHost && <p className="text-slate-500">Source: {bar.sourceHost}</p>}
    </div>
  );
}

function buildChartData(price: number, mileage: number, valuation: MarketValuation): ChartBar[] {
  const dealerBars: ChartBar[] = valuation.comparables
    // Copilot suggestion ignored: highlighted comparables are legacy listing duplicates; the seller listing bar is appended separately from vehicle price/mileage.
    .filter((point) => !point.highlighted)
    .map((point) => ({
      name: formatComparableLabel(point),
      value: point.price,
      mileage: point.mileage ?? Number.POSITIVE_INFINITY,
      fill: '#e2e8f0',
      ...(point.sourceUrl?.trim()
        ? { sourceHost: parseSourceHostname(point.sourceUrl.trim()) }
        : {}),
    }));

  const listingBar: ChartBar = {
    name: `This Listing (${formatMileageShort(mileage)})`,
    value: price,
    mileage,
    fill: '#dc2626',
  };

  return [...dealerBars, listingBar];
}

function sortChartData(data: ChartBar[], mode: SortMode): ChartBar[] {
  if (mode === 'default') return data;
  const sorted = [...data];
  if (mode === 'price') sorted.sort((a, b) => a.value - b.value);
  if (mode === 'mileage') sorted.sort((a, b) => a.mileage - b.mileage);
  return sorted;
}

export default function MarketChart({ price, mileage, valuation }: MarketChartProps) {
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const chartData = useMemo(() => {
    const data = buildChartData(price, mileage, valuation);
    return sortChartData(data, sortMode);
  }, [price, mileage, valuation, sortMode]);

  const values = chartData.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = Math.round((maxValue - minValue) * 0.1) || 2000;
  const yMin = Math.max(0, minValue - padding);
  const yMax = maxValue + padding;

  const defaultIntro = `While algorithmic offers from dealers focus on wholesale turnover, a true market analysis illustrates the replacement cost for a vehicle of this specific configuration and condition. Finding an equivalent vehicle in Good to Excellent condition with roughly ${mileageFormatter.format(mileage)} miles is currently difficult, driving up its intrinsic value.`;

  return (
    <section id="market" className="mb-16 pt-8">
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold text-slate-900">Market Valuation Context</h2>
        <p className="max-w-2xl text-sm whitespace-pre-wrap text-slate-500">
          {valuation.contextText || defaultIntro}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Pricing Comparison (Dealership Asking Prices)
            </h3>
            <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5 text-xs">
              {SORT_OPTIONS.map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={sortMode === mode}
                  onClick={() => setSortMode(mode)}
                  className={
                    sortMode === mode
                      ? 'rounded-md bg-slate-900 px-2.5 py-1 font-medium text-white'
                      : 'rounded-md px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tickFormatter={(value) => `$${value / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">
              Dealer Retail Reality
            </span>
            {valuation.dealerRealityText ? (
              <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-500">
                {valuation.dealerRealityText}
              </div>
            ) : (
              <>
                <p className="mb-1 text-sm font-semibold text-slate-900">$25,500 - $26,500+</p>
                <p className="text-xs leading-relaxed text-slate-500">
                  Dealerships price these trucks at a premium, then frequently add mandatory
                  documentation fees, prep fees, and taxes that drive the out-the-door cost even
                  higher.
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">
              KBB Private Party Value
            </span>
            {valuation.kbbText ? (
              <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-500">
                {valuation.kbbText}
              </div>
            ) : (
              <>
                <p className="mb-1 text-sm font-semibold text-slate-900">$23,652 Target Value</p>
                <p className="text-xs leading-relaxed text-slate-500">
                  The specific target value based on mileage and standard options. The recognized
                  fair market range is $22,552 - $24,752 for a private transaction in Good
                  condition.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col rounded-xl bg-slate-900 p-5 text-white shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                This Listing
              </span>
              <span className="text-xl font-bold text-red-600">{priceFormatter.format(price)}</span>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-400">
              {valuation.justificationText ||
                "A fair, data-backed price that reflects the vehicle's condition and recent maintenance."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
