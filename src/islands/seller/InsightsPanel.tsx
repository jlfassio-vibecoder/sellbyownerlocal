import { useEffect, useState } from 'react';
import { BarChart3, Lightbulb } from 'lucide-react';
import type {
  ListingAnalyticsRange,
  ListingAnalyticsResponse,
  ListingAnalyticsSummary,
} from '../../schemas';

interface InsightsPanelProps {
  vehicleId: string;
}

const RANGE_OPTIONS: { value: ListingAnalyticsRange; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
];

function formatDwellTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function selectGuidance(summary: ListingAnalyticsSummary): string {
  if (summary.searchImpressions > 100 && summary.clickThroughRate < 2) {
    return "Seen in search, but buyers aren't clicking. Update your hero photo or check your price against comps.";
  }

  if (summary.clickThroughRate > 5 && summary.avgDwellTimeSeconds < 30) {
    return 'Buyers click from search but leave quickly. Ensure your description is detailed and interior photos are clear.';
  }

  if (
    summary.avgDwellTimeSeconds > 60 &&
    summary.activeSaves > 0 &&
    summary.inquiryCount === 0
  ) {
    return 'Shoppers are highly engaged but hesitant to reach out. They are waiting for a price drop.';
  }

  if (summary.inquiryCount > 0) {
    return 'You have strong, verified interest. Hold your asking price firm.';
  }

  return 'Traffic is building. Keep an eye on your search impressions.';
}

function isEmptySummary(summary: ListingAnalyticsSummary): boolean {
  return (
    summary.searchImpressions === 0 &&
    summary.totalPageViews === 0 &&
    summary.uniqueVisitors === 0 &&
    summary.activeSaves === 0 &&
    summary.inquiryCount === 0
  );
}

function rangeButtonClass(isActive: boolean): string {
  return `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

export default function InsightsPanel({ vehicleId }: InsightsPanelProps) {
  const [range, setRange] = useState<ListingAnalyticsRange>('30d');
  const [data, setData] = useState<ListingAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/seller/vehicles/${vehicleId}/analytics?range=${range}`,
          { credentials: 'same-origin' }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load insights');
        }

        const json = (await res.json()) as ListingAnalyticsResponse;
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load insights');
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [vehicleId, range]);

  const summary = data?.summary;
  const maxSectionViews = data?.sections.length
    ? Math.max(...data.sections.map((section) => section.viewCount), 1)
    : 1;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Listing Insights</h2>
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm"
                />
              ))}
            </div>
            <p className="text-center text-sm text-slate-500">Loading insights…</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-red-600">{error}</p>
            <p className="mt-2 text-sm text-slate-500">Try refreshing the page.</p>
          </div>
        ) : summary && isEmptySummary(summary) ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <BarChart3 size={48} className="mx-auto mb-4 text-gray-600 opacity-20" />
            <p className="text-lg font-medium text-gray-500">No views yet</p>
            <p className="mt-2 text-sm text-gray-400">
              Share your listing link locally to start building traffic.
            </p>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <StatCard label="Search Impressions" value={summary.searchImpressions.toLocaleString()} />
              <StatCard label="CTR" value={`${summary.clickThroughRate.toFixed(1)}%`} />
              <StatCard
                label="Total Page Views"
                value={summary.totalPageViews.toLocaleString()}
              />
              <StatCard
                label="Avg Dwell Time"
                value={formatDwellTime(summary.avgDwellTimeSeconds)}
              />
              <StatCard label="Saves" value={summary.activeSaves.toLocaleString()} />
              <StatCard
                label="Verified Inquiries"
                value={summary.inquiryCount.toLocaleString()}
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <Lightbulb size={20} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800">
                    Insight
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-amber-900">
                    {selectGuidance(summary)}
                  </p>
                </div>
              </div>
            </div>

            {data.sections.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Section Engagement</h3>
                <div className="space-y-4">
                  {data.sections.map((section) => (
                    <div key={section.sectionId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{section.label}</span>
                        <span className="text-slate-500">
                          {section.viewCount.toLocaleString()} views
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-red-600 transition-all"
                          style={{
                            width: `${(section.viewCount / maxSectionViews) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Metrics reflect anonymous browsing sessions. Dwell time is averaged from tab-close
              events and may undercount quick visits.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
