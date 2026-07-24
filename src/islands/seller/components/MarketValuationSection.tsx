import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Brain, Check, CheckCircle, Loader2, Plus } from 'lucide-react';
import { AiApiError, generateMarketResearch } from '../../../lib/ai-api';
import { parseCurrencyString } from '../../../lib/vehicle-form-mapper';
import MediaPickerModal from '../MediaPickerModal';
import MarkdownTextarea from './MarkdownTextarea';
import ComparableRow from './ComparableRow';
import type { DetailsSectionFormProps } from './form-section-types';
import { TEXTAREA_CLASS_SHORT } from './form-section-types';

const TEXT_FIELDS = [
  {
    name: 'marketValuation.contextText' as const,
    label: 'Context Intro',
    helper: 'Intro paragraph under the "Market Valuation Context" heading on the public listing.',
  },
  {
    name: 'marketValuation.dealerRealityText' as const,
    label: 'Dealer Retail Reality',
    helper: 'Text shown in the "Dealer Retail Reality" sidebar card.',
  },
  {
    name: 'marketValuation.kbbText' as const,
    label: 'KBB Private Party Value',
    helper: 'Text shown in the "KBB Private Party Value" sidebar card.',
  },
  {
    name: 'marketValuation.justificationText' as const,
    label: 'This Listing',
    helper: 'Text shown in the dark "This Listing" sidebar card.',
  },
];

type DeductionKey = 'tires' | 'paint' | 'mechanical' | 'interior' | 'other';
type ActiveDeductions = Record<DeductionKey, boolean>;

const DEFAULT_ACTIVE: ActiveDeductions = {
  tires: true,
  paint: true,
  mechanical: true,
  interior: true,
  other: true,
};

const DEDUCTION_FIELDS: { key: DeductionKey; label: string }[] = [
  { key: 'tires', label: 'Tires' },
  { key: 'paint', label: 'Paint' },
  { key: 'mechanical', label: 'Mechanical' },
  { key: 'interior', label: 'Interior' },
  { key: 'other', label: 'Other' },
];

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

function formatDeduction(value: number | undefined): string {
  if (value == null || value <= 0) return '—';
  return formatCurrency(value);
}

interface MarketValuationSectionProps extends DetailsSectionFormProps {
  vehicleId: string;
}

export default function MarketValuationSection({
  vehicleId,
  register,
  control,
  setValue,
  watch,
}: MarketValuationSectionProps) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [activeDeductions, setActiveDeductions] = useState<ActiveDeductions>(DEFAULT_ACTIVE);
  const [askingPriceSet, setAskingPriceSet] = useState(false);
  const [priceSetToast, setPriceSetToast] = useState(false);
  const [marketPickerOpen, setMarketPickerOpen] = useState(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const marketImageUrls = watch('marketImageUrls') ?? [];
  const libraryUrls = watch('images') ?? [];
  const retailReadyPrice = watch('marketValuation.retailReadyPrice');
  const vehicleDeductions = watch('marketValuation.vehicleDeductions');
  const hasResearchResults =
    Boolean(retailReadyPrice?.trim()) ||
    DEDUCTION_FIELDS.some((field) => (vehicleDeductions?.[field.key] ?? 0) > 0) ||
    Boolean(vehicleDeductions?.notes?.trim());

  const applicableDeductions = useMemo(
    () =>
      DEDUCTION_FIELDS.filter(({ key }) => {
        const amount = vehicleDeductions?.[key];
        return amount != null && amount > 0;
      }),
    [vehicleDeductions]
  );

  const baselinePrice = useMemo(() => {
    const raw = retailReadyPrice?.trim();
    if (!raw) return null;
    try {
      return parseCurrencyString(raw);
    } catch {
      return null;
    }
  }, [retailReadyPrice]);

  const activeDeductionTotal = useMemo(
    () =>
      DEDUCTION_FIELDS.reduce((sum, { key }) => {
        if (!activeDeductions[key]) return sum;
        const amount = vehicleDeductions?.[key];
        return sum + (amount != null && amount > 0 ? amount : 0);
      }, 0),
    [activeDeductions, vehicleDeductions]
  );

  const calculatedPrice = useMemo(() => {
    if (baselinePrice == null) return null;
    return Math.max(0, baselinePrice - activeDeductionTotal);
  }, [baselinePrice, activeDeductionTotal]);

  useEffect(() => {
    setAskingPriceSet(false);
  }, [calculatedPrice]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'marketValuation.comparables',
  });

  const toggleDeduction = (key: DeductionKey) => {
    setActiveDeductions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) {
      dragItem.current = null;
      dragOverItem.current = null;
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }

    const from = dragItem.current;
    const to = dragOverItem.current;

    if (from !== to) {
      move(from, to);
    }

    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleRunResearch = async () => {
    setResearchError(null);
    setIsResearching(true);

    try {
      const result = await generateMarketResearch(vehicleId);
      const { marketValuation } = result;
      const existingComparables = watch('marketValuation.comparables') ?? [];

      setValue('marketValuation.contextText', marketValuation.contextText ?? '', {
        shouldDirty: true,
      });
      setValue('marketValuation.dealerRealityText', marketValuation.dealerRealityText ?? '', {
        shouldDirty: true,
      });
      setValue('marketValuation.kbbText', marketValuation.kbbText ?? '', { shouldDirty: true });
      setValue(
        'marketValuation.justificationText',
        marketValuation.justificationText ?? '',
        { shouldDirty: true }
      );
      setValue(
        'marketValuation.retailReadyPrice',
        marketValuation.retailReadyPrice
          ? formatCurrency(marketValuation.retailReadyPrice)
          : '',
        { shouldDirty: true }
      );
      setValue('marketValuation.vehicleDeductions', marketValuation.vehicleDeductions ?? {}, {
        shouldDirty: true,
      });
      setValue('marketValuation.comparables', existingComparables, { shouldDirty: false });
      setActiveDeductions(DEFAULT_ACTIVE);
    } catch (err) {
      console.error('Deep market research failed', err);
      if (err instanceof AiApiError) {
        setResearchError(err.message);
      } else {
        setResearchError('Failed to run deep market analysis. Please try again.');
      }
    } finally {
      setIsResearching(false);
    }
  };

  const handleSetAskingPrice = () => {
    if (calculatedPrice == null || calculatedPrice <= 0) return;
    setValue('price', formatCurrency(calculatedPrice), { shouldDirty: true });

    setAskingPriceSet(true);
    setPriceSetToast(true);

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setAskingPriceSet(false);
      setPriceSetToast(false);
      feedbackTimeoutRef.current = null;
    }, 3000);
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Market Valuation Context</h2>

      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600 mb-3">
            Runs against your saved listing data. Save any Basics changes before running analysis.
          </p>
          <button
            type="button"
            onClick={handleRunResearch}
            disabled={isResearching}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResearching ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Brain size={16} aria-hidden="true" />
            )}
            Run Deep Market Analysis
          </button>
          {researchError ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {researchError}
            </p>
          ) : null}
        </div>

        {hasResearchResults ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
                  Your Adjusted Price
                </p>
                <p className="text-2xl font-bold text-slate-900 transition-all duration-300 tabular-nums">
                  {calculatedPrice != null ? formatCurrency(calculatedPrice) : '—'}
                </p>
                {baselinePrice != null && applicableDeductions.length > 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Baseline retail ready: {retailReadyPrice?.trim()}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleSetAskingPrice}
                disabled={calculatedPrice == null || calculatedPrice <= 0 || askingPriceSet}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                  askingPriceSet
                    ? 'border border-emerald-500 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {askingPriceSet ? (
                  <>
                    <Check size={16} aria-hidden="true" />
                    Asking Price Set
                  </>
                ) : (
                  'Set as Asking Price'
                )}
              </button>
            </div>

            {applicableDeductions.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Does your vehicle need any of this standard reconditioning? (Uncheck if already
                  resolved)
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {applicableDeductions.map(({ key, label }) => {
                    const isActive = activeDeductions[key];
                    const amount = vehicleDeductions?.[key];

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleDeduction(key)}
                        aria-pressed={isActive}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-200 ${
                          isActive
                            ? 'border-emerald-300 bg-white ring-2 ring-emerald-500/40'
                            : 'border-slate-200 bg-slate-50 opacity-50'
                        }`}
                      >
                        <span
                          className={`font-medium text-slate-700 ${!isActive ? 'line-through' : ''}`}
                        >
                          {label}
                        </span>
                        <span className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-slate-900 tabular-nums ${!isActive ? 'line-through' : ''}`}
                          >
                            {formatDeduction(amount)}
                          </span>
                          {isActive ? (
                            <Check size={14} className="text-emerald-600 shrink-0" aria-hidden="true" />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {vehicleDeductions?.notes?.trim() ? (
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-700">Notes: </span>
                {vehicleDeductions.notes.trim()}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Market Valuation Photos
          </label>
          <p className="mb-3 text-xs text-slate-500">
            Up to 6 images shown in the market valuation grid on the public listing.
          </p>
          <button
            type="button"
            onClick={() => setMarketPickerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🖼️ Select Market Images (Max 6)
          </button>
          {marketImageUrls.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {marketImageUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {TEXT_FIELDS.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
            <p className="text-xs text-slate-500 mb-2">{field.helper}</p>
            <MarkdownTextarea
              id={field.name}
              value={(watch(field.name) as string | undefined) ?? ''}
              onChange={(value) => setValue(field.name, value, { shouldDirty: true })}
              className={TEXTAREA_CLASS_SHORT}
            />
          </div>
        ))}

        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-slate-700">Comparable Vehicles</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Up to 5 dealer listings shown in the pricing comparison chart. Drag to reorder the
                default view. Optional specs, exterior color, image URL, and source URL enrich the
                card. On promoted public listings, only the source site name is shown (not linked).
                After promoting, saving this form also updates the public marketplace card price and
                details. Your listing price and mileage are added automatically.
              </p>
            </div>
            <button
              type="button"
              disabled={fields.length >= 5}
              onClick={() =>
                append({
                  label: '',
                  price: 0,
                  mileage: undefined,
                  sourceUrl: '',
                  imageUrl: '',
                  matchLevel: 'exact',
                  differences: [],
                })
              }
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Add Comp
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-lg">
              No comparables added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <ComparableRow
                  key={field.id}
                  index={index}
                  vehicleId={vehicleId}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  draggingIndex={draggingIndex}
                  dragOverIndex={dragOverIndex}
                  onDragStart={(i) => {
                    dragItem.current = i;
                    setDraggingIndex(i);
                  }}
                  onDragEnter={(i) => {
                    dragOverItem.current = i;
                    setDragOverIndex(i);
                  }}
                  onDragEnd={handleDragEnd}
                  onRemove={remove}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {priceSetToast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md bg-emerald-600 p-4 font-medium text-white shadow-lg transition-all duration-300"
        >
          <CheckCircle size={20} aria-hidden="true" />
          Asking price set, remember to save changes
        </div>
      ) : null}

      <MediaPickerModal
        isOpen={marketPickerOpen}
        onClose={() => setMarketPickerOpen(false)}
        libraryUrls={libraryUrls}
        initialSelectedUrls={marketImageUrls}
        maxCount={6}
        title="Select market valuation images"
        onSave={(urls) => {
          setValue('marketImageUrls', urls, { shouldDirty: true });
        }}
      />
    </>
  );
}
