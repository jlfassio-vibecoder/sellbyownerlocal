import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Sparkles } from 'lucide-react';
import { generateHeroImage, generateListingFromVin } from '../lib/ai-api';

interface DealerFormValues {
  firstName: string;
  lastName: string;
  vin: string;
}

type Step = 'idle' | 'decode' | 'text' | 'image' | 'done' | 'error';

const STEPS: { key: Step; label: string }[] = [
  { key: 'decode', label: 'Decoding VIN' },
  { key: 'text', label: 'Writing listing' },
  { key: 'image', label: 'Rendering hero image' },
];

function stepIndex(step: Step): number {
  if (step === 'decode') return 0;
  if (step === 'text') return 1;
  if (step === 'image') return 2;
  if (step === 'done') return 3;
  return -1;
}

export default function DealerNewListingForm() {
  const [step, setStep] = useState<Step>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DealerFormValues>({
    defaultValues: { firstName: '', lastName: '', vin: '' },
  });

  const onSubmit = async (values: DealerFormValues) => {
    setErrorMessage(null);
    setStep('decode');

    try {
      setStep('text');
      const listing = await generateListingFromVin({
        vin: values.vin.trim().toUpperCase(),
        prospect: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
        },
      });

      setStep('image');
      await generateHeroImage(listing.vehicleId);

      setStep('done');
      window.location.href = `/vehicles/${listing.vehicleId}`;
    } catch (error) {
      console.error('Dealer listing generation failed', error);
      setStep('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Generation failed. Please retry.'
      );
    }
  };

  const activeIndex = stepIndex(step);
  const isBusy = step !== 'idle' && step !== 'error' && step !== 'done';

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
          <Sparkles size={22} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">AI VIN Listing Generator</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter customer details and a VIN to generate a personalized listing with Monroney sticker
          data and hero image.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-slate-700">
              Customer First Name
            </label>
            <input
              id="firstName"
              {...register('firstName', { required: 'First name is required' })}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600"
              disabled={isBusy}
            />
            {errors.firstName ? (
              <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-slate-700">
              Customer Last Name
            </label>
            <input
              id="lastName"
              {...register('lastName', { required: 'Last name is required' })}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600"
              disabled={isBusy}
            />
            {errors.lastName ? (
              <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="vin" className="mb-2 block text-sm font-medium text-slate-700">
            VIN
          </label>
          <input
            id="vin"
            {...register('vin', {
              required: 'VIN is required',
              minLength: { value: 17, message: 'VIN must be 17 characters' },
              maxLength: { value: 17, message: 'VIN must be 17 characters' },
            })}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono uppercase outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600"
            placeholder="1C6RR7MT3HS761025"
            disabled={isBusy}
          />
          {errors.vin ? <p className="mt-1 text-xs text-red-600">{errors.vin.message}</p> : null}
        </div>

        {activeIndex >= 0 ? (
          <ol className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm" aria-live="polite">
            {STEPS.map((item, index) => {
              const complete = activeIndex > index || step === 'done';
              const current = activeIndex === index && step !== 'done';
              return (
                <li
                  key={item.key}
                  className={`flex items-center gap-2 ${
                    complete ? 'text-emerald-700' : current ? 'font-semibold text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {current ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">{complete ? '✓' : '○'}</span>
                  )}
                  {item.label}
                </li>
              );
            })}
          </ol>
        ) : null}

        {errorMessage ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isBusy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-70"
        >
          {isBusy ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Generating…
            </>
          ) : (
            'Generate Listing'
          )}
        </button>
      </form>
    </div>
  );
}
