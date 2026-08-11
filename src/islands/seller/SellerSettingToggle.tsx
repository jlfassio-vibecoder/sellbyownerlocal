import { useEffect, useState } from 'react';

export interface SellerSettingToggleProps {
  userId: string;
  field: 'hideFab' | 'hideItemDetails' | 'hideListingsBackLink';
  initialValue?: boolean;
  title: string;
  description: string;
  ariaLabel: string;
  enabledToast: string;
  disabledToast: string;
}

export default function SellerSettingToggle({
  userId,
  field,
  initialValue = false,
  title,
  description,
  ariaLabel,
  enabledToast,
  disabledToast,
}: SellerSettingToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  useEffect(() => {
    setEnabled(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleToggle = async () => {
    if (isSaving) return;

    const next = !enabled;
    setEnabled(next);
    setIsSaving(true);
    setToast(null);

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: next }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to update setting'
        );
      }

      setToast({
        message: next ? enabledToast : disabledToast,
        type: 'success',
      });
    } catch (err) {
      setEnabled(!next);
      setToast({
        message: err instanceof Error ? err.message : 'Failed to update setting',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={ariaLabel}
          disabled={isSaving}
          onClick={() => void handleToggle()}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            enabled ? 'bg-red-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
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
