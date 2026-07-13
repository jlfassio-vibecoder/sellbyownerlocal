import { useState } from 'react';
import { Loader2, Shield } from 'lucide-react';

interface SecureCheckoutCTAProps {
  vehicleId: string;
  price: number;
  isLoggedIn?: boolean;
  loginHref?: string;
}

export default function SecureCheckoutCTA({
  vehicleId,
  price,
  isLoggedIn = false,
  loginHref = '/login',
}: SecureCheckoutCTAProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (busy) return;

    if (!isLoggedIn) {
      window.location.href = loginHref;
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data &&
          typeof data === 'object' &&
          'error' in data &&
          typeof (data as { error: unknown }).error === 'string'
            ? (data as { error: string }).error
            : 'Unable to start secure transaction';
        setError(message);
        return;
      }

      const redirectUrl =
        data &&
        typeof data === 'object' &&
        'redirectUrl' in data &&
        typeof (data as { redirectUrl: unknown }).redirectUrl === 'string'
          ? (data as { redirectUrl: string }).redirectUrl
          : null;

      if (!redirectUrl) {
        setError('Secure checkout did not return a redirect URL');
        return;
      }

      window.location.href = redirectUrl;
    } catch {
      setError('Unable to start secure transaction');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Shield size={18} aria-hidden="true" />
        )}
        {busy ? 'Starting…' : 'Start Secure Transaction'}
      </button>
      <p className="mt-2 text-xs text-slate-500">
        Protected checkout for {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(price)}
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
