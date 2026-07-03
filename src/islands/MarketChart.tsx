import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MarketValuation } from '../schemas';

interface MarketChartProps {
  price: number;
  mileage: number;
  valuation: MarketValuation;
}

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const mileageFormatter = new Intl.NumberFormat('en-US');

export default function MarketChart({ price, mileage, valuation }: MarketChartProps) {
  const chartData = valuation.comparisons.map((point) => ({
    ...point,
    fill: point.highlighted ? '#dc2626' : '#e2e8f0',
  }));

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
          {valuation.intro || defaultIntro}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-6 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            Pricing Comparison (Dealership Asking Prices)
          </h3>
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
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(value) => {
                    const amount = typeof value === 'number' ? value : Number(value ?? 0);
                    return [`$${amount.toLocaleString()}`, 'Valuation'];
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
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
            {valuation.dealerReality ? (
              <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-500">
                {valuation.dealerReality}
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
            {valuation.kbbValue ? (
              <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-500">
                {valuation.kbbValue}
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
              {valuation.thisTruck ||
                "A fair, data-backed price that reflects the vehicle's condition and recent maintenance."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
