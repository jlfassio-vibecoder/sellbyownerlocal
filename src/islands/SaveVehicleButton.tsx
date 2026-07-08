import { useState } from 'react';
import { Heart } from 'lucide-react';
import type { VerificationTier } from '../schemas';

interface SaveVehicleButtonProps {
  vehicleId: string;
  isLoggedIn: boolean;
  verificationTier: VerificationTier;
  loginHref: string;
  initialSaved?: boolean;
}

export default function SaveVehicleButton({
  vehicleId,
  isLoggedIn,
  verificationTier,
  loginHref,
  initialSaved = false,
}: SaveVehicleButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = isLoggedIn && verificationTier !== 'anonymous';

  const handleToggle = async () => {
    if (!canSave || isSaving) return;

    const previousSaved = saved;
    setSaved(!previousSaved);
    setError(null);
    setIsSaving(true);

    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/save`, {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'VERIFICATION_REQUIRED') {
          throw new Error('Verify your phone number to save listings.');
        }
        throw new Error(data.error || 'Failed to update save status');
      }

      const data = await res.json();
      setSaved(Boolean(data.saved));
    } catch (err) {
      setSaved(previousSaved);
      setError(err instanceof Error ? err.message : 'Failed to update save status');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <a
        href={loginHref}
        className="flex items-center gap-1.5 text-slate-400 transition-colors hover:text-white"
        aria-label="Log in to save this vehicle"
        title="Log in to save this vehicle"
      >
        <Heart size={20} />
        <span className="hidden text-sm font-medium lg:inline">Save</span>
      </a>
    );
  }

  if (!canSave) {
    return (
      <button
        type="button"
        disabled
        className="flex cursor-not-allowed items-center gap-1.5 text-slate-500"
        aria-label="Verify phone to save this vehicle"
        title="Verify phone to save"
      >
        <Heart size={20} />
        <span className="hidden text-sm font-medium lg:inline">Save</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isSaving}
        className={`flex items-center gap-1.5 transition-colors ${
          saved ? 'text-rose-400 hover:text-rose-300' : 'text-slate-400 hover:text-white'
        }`}
        aria-label={saved ? 'Unsave this vehicle' : 'Save this vehicle'}
        aria-pressed={saved}
        title={saved ? 'Saved' : 'Save listing'}
      >
        <Heart size={20} className={saved ? 'fill-current' : undefined} />
        <span className="hidden text-sm font-medium lg:inline">{saved ? 'Saved' : 'Save'}</span>
      </button>
      {error && (
        <span className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-rose-300">
          {error}
        </span>
      )}
    </div>
  );
}
