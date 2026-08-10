import { useEffect, useState } from 'react';
import { BarChart3, Lightbulb } from 'lucide-react';
import type {
  ApparelAnalyticsResponse,
  ApparelEngagedBuyer,
  ApparelFunnelStage,
  ApparelJourney,
  ApparelSkuAnalyticsRow,
  IntentTier,
  ListingAnalyticsRange,
} from '../../schemas';

const RANGE_OPTIONS: { value: ListingAnalyticsRange; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
];

function rangeButtonClass(isActive: boolean): string {
  return `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

function intentTierBadgeClass(tier: IntentTier): string {
  switch (tier) {
    case 'HIGH':
      return 'bg-emerald-100 text-emerald-800';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-800';
    case 'LOW':
      return 'bg-slate-100 text-slate-600';
  }
}

function FunnelSection({ funnel }: { funnel: ApparelFunnelStage[] }) {
  const maxCount = Math.max(...funnel.map((stage) => stage.count), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-900">Conversion funnel</h3>
      <div className="space-y-4">
        {funnel.map((stage) => (
          <div key={stage.id}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{stage.label}</span>
              <span className="shrink-0 text-slate-500">
                {stage.count.toLocaleString()}
                {stage.dropOffPercent !== null && (
                  <span className="ml-2 text-xs text-slate-400">
                    −{stage.dropOffPercent.toFixed(0)}% drop-off
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-red-600 transition-all"
                style={{ width: `${(stage.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkuLeaderboard({ skus }: { skus: ApparelSkuAnalyticsRow[] }) {
  if (skus.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-lg font-bold text-slate-900">SKU performance</h3>
        <p className="text-sm text-slate-500">No active catalog items yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-900">SKU performance</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="px-2 py-2 font-medium">Impr.</th>
              <th className="px-2 py-2 font-medium">PDP</th>
              <th className="px-2 py-2 font-medium">Favs</th>
              <th className="px-2 py-2 font-medium">Quotes</th>
              <th className="px-2 py-2 font-medium">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {skus.map((sku) => (
              <tr
                key={sku.clothingId}
                className={`border-b border-slate-100 ${
                  sku.needsOptimization ? 'bg-amber-50/70' : ''
                }`}
              >
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    {sku.imageUrl ? (
                      <img
                        src={sku.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                        —
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{sku.title}</p>
                      {sku.needsOptimization && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
                          <Lightbulb size={12} />
                          High interest, no quotes
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-slate-700">{sku.impressions}</td>
                <td className="px-2 py-3 text-slate-700">{sku.pdpViews}</td>
                <td className="px-2 py-3 text-slate-700">{sku.favoriteAdds}</td>
                <td className="px-2 py-3 text-slate-700">{sku.quoteSubmits}</td>
                <td className="px-2 py-3 text-slate-700">
                  {sku.conversionRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TopEngagedBuyersSection({ buyers }: { buyers: ApparelEngagedBuyer[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-900">Top Engaged Buyers</h3>
      {buyers.length === 0 ? (
        <p className="text-sm text-slate-500">
          No engaged visitor sessions yet for this range.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-medium">Visitor</th>
                <th className="px-2 py-2 font-medium">Visit days</th>
                <th className="px-2 py-2 font-medium">Favorites</th>
                <th className="px-2 py-2 font-medium">Intent</th>
                <th className="px-2 py-2 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((buyer) => (
                <tr key={buyer.sessionId} className="border-b border-slate-100">
                  <td className="py-3 pr-3 font-mono text-slate-800">
                    {buyer.sessionShortId}
                  </td>
                  <td className="px-2 py-3 text-slate-700">{buyer.visitDays}</td>
                  <td className="px-2 py-3 text-slate-700">{buyer.favoriteCount}</td>
                  <td className="px-2 py-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${intentTierBadgeClass(buyer.intentTier)}`}
                    >
                      {buyer.intentScore}
                      <span className="font-medium opacity-80">{buyer.intentTier}</span>
                    </span>
                  </td>
                  <td className="px-2 py-3 text-slate-500">
                    {new Date(buyer.lastSeenAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function JourneysSection({ journeys }: { journeys: ApparelJourney[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-900">Recent visitor journeys</h3>
      {journeys.length === 0 ? (
        <p className="text-sm text-slate-500">
          No public visitor sessions yet for this range.
        </p>
      ) : (
        <ul className="space-y-4">
          {journeys.map((journey) => (
            <li
              key={journey.sessionId}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-mono">Session {journey.sessionShortId}</span>
                <span>{new Date(journey.lastSeenAt).toLocaleString()}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {journey.steps.map((step, index) => (
                  <span
                    key={`${journey.sessionId}-${index}-${step.timestamp}`}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
                  >
                    {step.label}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ApparelInsightsPanel() {
  const [range, setRange] = useState<ListingAnalyticsRange>('30d');
  const [data, setData] = useState<ApparelAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/seller/apparel/analytics?range=${range}`, {
          credentials: 'same-origin',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load insights');
        }
        const json = (await res.json()) as ApparelAnalyticsResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load insights');
          setData(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const isEmpty =
    data &&
    data.funnel.every((stage) => stage.count === 0) &&
    data.skus.every(
      (sku) =>
        sku.impressions === 0 &&
        sku.pdpViews === 0 &&
        sku.favoriteAdds === 0 &&
        sku.quoteSubmits === 0
    );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Apparel Insights</h2>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={rangeButtonClass(range === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-slate-500">Loading insights…</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-red-600">{error}</p>
          </div>
        ) : isEmpty ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <BarChart3 size={48} className="mx-auto mb-4 text-gray-600 opacity-20" />
            <p className="text-lg font-medium text-gray-500">No visitor activity yet</p>
            <p className="mt-2 text-sm text-gray-400">
              Share your storefront to start capturing funnel events.
            </p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <FunnelSection funnel={data.funnel} />
            <SkuLeaderboard skus={data.skus} />
            <TopEngagedBuyersSection buyers={data.topEngagedBuyers ?? []} />
            <JourneysSection journeys={data.journeys} />
            <p className="text-xs text-slate-400">
              Owner and internal admin visits are excluded. Funnel stages use unique visitor
              sessions.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
