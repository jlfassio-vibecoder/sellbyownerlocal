import { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Loader2, Trash2 } from 'lucide-react';
import { AiApiError, extractServiceHistory } from '../../lib/ai-api';
import type { ServiceRecord } from '../../schemas';
import type { DetailsSectionFormProps } from './components/form-section-types';
import { INPUT_CLASS_SIMPLE } from './components/form-section-types';

const MAX_HIGHLIGHTS = 6;

type ServiceHistoryEditorProps = Pick<
  DetailsSectionFormProps,
  'control' | 'register' | 'setValue' | 'watch'
> & {
  vehicleId: string;
};

function recordSource(record: ServiceRecord | undefined): 'carfax' | 'seller' {
  return record?.source ?? 'carfax';
}

function RecordTags({ record }: { record: ServiceRecord | undefined }) {
  if (!record) return null;

  const source = recordSource(record);
  const isHidden = record.isHidden ?? false;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {source === 'seller' ? (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
          User Added
        </span>
      ) : record.isEdited ? (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
          Edited
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
          From Report
        </span>
      )}
      {isHidden && (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
          Hidden
        </span>
      )}
    </div>
  );
}

export default function ServiceHistoryEditor({
  vehicleId,
  control,
  register,
  setValue,
  watch,
}: ServiceHistoryEditorProps) {
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const historyReportUrls = watch('historyReportUrls') ?? [];
  const serviceRecords = watch('serviceRecords') ?? [];

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'serviceRecords',
  });

  const visibleHighlightCount = serviceRecords.filter(
    (r) => r.isHighlighted && !r.isHidden
  ).length;

  const handleExtract = async () => {
    setExtracting(true);
    setExtractError(null);

    try {
      const result = await extractServiceHistory(vehicleId);
      const newRecords = result.records.map((record) => ({
        id: crypto.randomUUID(),
        date: record.date,
        description: record.description,
        isHighlighted: false,
        isHidden: false,
        source: 'carfax' as const,
        isEdited: false,
      }));

      for (const record of newRecords) {
        append(record);
      }
    } catch (err) {
      const message =
        err instanceof AiApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to extract service history';
      setExtractError(message);
    } finally {
      setExtracting(false);
    }
  };

  const toggleHighlight = (index: number) => {
    const record = serviceRecords[index];
    if (!record) return;

    const nextHighlighted = !record.isHighlighted;
    if (nextHighlighted && visibleHighlightCount >= MAX_HIGHLIGHTS) {
      return;
    }

    setValue(`serviceRecords.${index}.isHighlighted`, nextHighlighted, {
      shouldDirty: true,
    });
  };

  const toggleHidden = (index: number) => {
    const record = serviceRecords[index];
    if (!record) return;

    setValue(`serviceRecords.${index}.isHidden`, !record.isHidden, {
      shouldDirty: true,
    });
  };

  const handleAddManualRecord = () => {
    append({
      id: crypto.randomUUID(),
      date: '',
      description: '',
      isHighlighted: false,
      isHidden: false,
      source: 'seller',
      isEdited: false,
    });
  };

  const markCarfaxEdited = (index: number) => {
    const record = serviceRecords[index];
    if (!record || recordSource(record) !== 'carfax') return;

    setValue(`serviceRecords.${index}.isEdited`, true, { shouldDirty: true });
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <label className="mb-2 block text-sm font-medium text-slate-700">Service History</label>
      <p className="mb-3 text-xs text-slate-500">
        Extract maintenance records from uploaded history reports, then edit, highlight key items
        (max {MAX_HIGHLIGHTS}), or hide incorrect entries. Add manual records for work not on the
        report.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExtract}
          disabled={extracting || historyReportUrls.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {extracting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <span aria-hidden>✨</span>
          )}
          Extract from History Report
        </button>
      </div>

      {historyReportUrls.length === 0 && (
        <p className="mb-3 text-xs text-amber-700">
          Upload a history report above before extracting service records.
        </p>
      )}

      {extractError && <p className="mb-3 text-sm text-red-600">{extractError}</p>}

      {fields.length === 0 ? (
        <p className="text-sm text-slate-500">No service records yet.</p>
      ) : (
        <ul className="space-y-4">
          {fields.map((field, index) => {
            const record = serviceRecords[index];
            const isHidden = record?.isHidden ?? false;
            const isHighlighted = record?.isHighlighted ?? false;
            const isSellerRecord = recordSource(record) === 'seller';
            const highlightDisabled =
              !isHighlighted && visibleHighlightCount >= MAX_HIGHLIGHTS;

            return (
              <li
                key={field.id}
                className={`rounded-lg border border-slate-200 p-4 ${
                  isHidden ? 'bg-slate-100 opacity-60' : 'bg-slate-50/50'
                }`}
              >
                <RecordTags record={record} />

                <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`serviceRecords.${index}.date`}
                      className="mb-1 block text-xs font-medium text-slate-600"
                    >
                      Date
                    </label>
                    <input
                      id={`serviceRecords.${index}.date`}
                      type="text"
                      {...register(`serviceRecords.${index}.date`)}
                      onChange={(e) => {
                        register(`serviceRecords.${index}.date`).onChange(e);
                        markCarfaxEdited(index);
                      }}
                      className={INPUT_CLASS_SIMPLE}
                      placeholder="NOV 14, 2024"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`serviceRecords.${index}.description`}
                      className="mb-1 block text-xs font-medium text-slate-600"
                    >
                      Description
                    </label>
                    <input
                      id={`serviceRecords.${index}.description`}
                      type="text"
                      {...register(`serviceRecords.${index}.description`)}
                      onChange={(e) => {
                        register(`serviceRecords.${index}.description`).onChange(e);
                        markCarfaxEdited(index);
                      }}
                      className={INPUT_CLASS_SIMPLE}
                      placeholder="Full synthetic oil change"
                    />
                  </div>
                </div>

                <input type="hidden" {...register(`serviceRecords.${index}.id`)} />
                <input
                  type="hidden"
                  {...register(`serviceRecords.${index}.isHighlighted`)}
                />
                <input type="hidden" {...register(`serviceRecords.${index}.isHidden`)} />
                <input type="hidden" {...register(`serviceRecords.${index}.source`)} />
                <input type="hidden" {...register(`serviceRecords.${index}.isEdited`)} />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleHighlight(index)}
                    disabled={highlightDisabled}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isHighlighted
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ⭐ Highlight (Max {MAX_HIGHLIGHTS})
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleHidden(index)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isHidden
                        ? 'border-slate-400 bg-slate-200 text-slate-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    👁️ Hide
                  </button>

                  {isSellerRecord && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={handleAddManualRecord}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <span aria-hidden>➕</span>
        Add Manual Record
      </button>
    </div>
  );
}
