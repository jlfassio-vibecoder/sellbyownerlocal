import { useMemo, useState } from 'react';
import type { ServiceRecord } from '../schemas';
import { sortServiceRecordsByDate } from '../lib/service-record-sort';

type ServiceTimelineProps = {
  records: ServiceRecord[];
};

type TimelineSegment =
  | { type: 'highlight'; record: ServiceRecord }
  | { type: 'routine'; records: ServiceRecord[]; groupKey: string };

function formatDisplayDate(date: string): string {
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(parsed));
}

function recordSource(record: ServiceRecord): 'carfax' | 'seller' {
  return record.source ?? 'carfax';
}

function isSellerReported(record: ServiceRecord): boolean {
  return recordSource(record) === 'seller';
}

function isTimelineAltered(records: ServiceRecord[]): boolean {
  return records.some((r) => {
    const source = recordSource(r);
    return source === 'seller' || (source === 'carfax' && (r.isEdited || r.isHidden));
  });
}

function SellerReportedBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
      Seller Reported
    </span>
  );
}

function DateLine({ record }: { record: ServiceRecord }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2">
      <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
        {formatDisplayDate(record.date)}
      </span>
      {isSellerReported(record) && <SellerReportedBadge />}
    </div>
  );
}

function buildSegments(records: ServiceRecord[]): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  let routineBatch: ServiceRecord[] = [];
  let routineGroupIndex = 0;

  const flushRoutine = () => {
    if (routineBatch.length === 0) return;
    segments.push({
      type: 'routine',
      records: routineBatch,
      groupKey: `routine-${routineGroupIndex}`,
    });
    routineGroupIndex += 1;
    routineBatch = [];
  };

  for (const record of records) {
    if (record.isHighlighted) {
      flushRoutine();
      segments.push({ type: 'highlight', record });
    } else {
      routineBatch.push(record);
    }
  }

  flushRoutine();
  return segments;
}

function HighlightRow({ record }: { record: ServiceRecord }) {
  return (
    <div className="relative">
      <div className="absolute top-1 -left-[25px] h-4 w-4 rounded-full border-2 border-white bg-red-600" />
      <DateLine record={record} />
      <p className="mt-1 text-sm font-semibold text-slate-900">{record.description}</p>
    </div>
  );
}

function RoutineGroup({
  records,
  groupKey,
  expanded,
  onToggle,
}: {
  records: ServiceRecord[];
  groupKey: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (expanded) {
    return (
      <div className="space-y-4">
        {records.map((record) => (
          <div key={record.id} className="relative">
            <div className="absolute top-1.5 -left-[23px] h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
            <DateLine record={record} />
            <p className="mt-0.5 text-sm text-slate-600">{record.description}</p>
          </div>
        ))}
        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          ↑ Collapse routine services
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-xs font-medium text-slate-500 hover:text-slate-700"
      aria-expanded={false}
      aria-controls={groupKey}
    >
      ↓ [{records.length}] routine service{records.length === 1 ? '' : 's'}
    </button>
  );
}

export default function ServiceTimeline({ records }: ServiceTimelineProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isAltered = useMemo(() => isTimelineAltered(records), [records]);

  const visibleRecords = useMemo(() => {
    return sortServiceRecordsByDate(records.filter((r) => !r.isHidden));
  }, [records]);

  const segments = useMemo(() => buildSegments(visibleRecords), [visibleRecords]);

  if (segments.length === 0) {
    return null;
  }

  return (
    <>
      {isAltered && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          This service timeline includes seller-reported entries and/or changes from the uploaded
          history report. Review the original CarFax report to confirm accuracy.
        </p>
      )}

      <div className="relative space-y-6 border-l-2 border-slate-200 pl-6">
        {segments.map((segment) => {
          if (segment.type === 'highlight') {
            return <HighlightRow key={segment.record.id} record={segment.record} />;
          }

          const expanded = expandedGroups[segment.groupKey] ?? false;

          return (
            <RoutineGroup
              key={segment.groupKey}
              groupKey={segment.groupKey}
              records={segment.records}
              expanded={expanded}
              onToggle={() =>
                setExpandedGroups((prev) => ({
                  ...prev,
                  [segment.groupKey]: !prev[segment.groupKey],
                }))
              }
            />
          );
        })}
      </div>
    </>
  );
}
