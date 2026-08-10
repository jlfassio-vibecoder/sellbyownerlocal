import { useEffect, useState } from 'react';

interface SellerFabSettingsPanelProps {
  userId: string;
  initialHideFab?: boolean;
}

export default function SellerFabSettingsPanel({
  userId,
  initialHideFab = false,
}: SellerFabSettingsPanelProps) {
  const [hideFab, setHideFab] = useState(initialHideFab);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  useEffect(() => {
    setHideFab(initialHideFab);
  }, [initialHideFab]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleToggle = async () => {
    if (isSaving) return;

    const next = !hideFab;
    setHideFab(next);
    setIsSaving(true);
    setToast(null);

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hideFab: next }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to update setting'
        );
      }

      setToast({
        message: next
          ? 'Buyer contact widget hidden on your listings.'
          : 'Buyer contact widget visible on your listings.',
        type: 'success',
      });
    } catch (err) {
      setHideFab(!next);
      setToast({
        message: err instanceof Error ? err.message : 'Failed to update setting',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Hide buyer contact widget</h3>
          <p className="mt-1 text-sm text-slate-500">
            When enabled, buyers will not see the floating Request Quote button on your apparel
            storefront, or Owner Messaging on your vehicle listings.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={hideFab}
          aria-label="Hide buyer contact widget"
          disabled={isSaving}
          onClick={() => void handleToggle()}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            hideFab ? 'bg-red-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              hideFab ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {toast && (
        <div
          role="status"
          className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium text-white ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </section>
  );
}
