import { Heart } from 'lucide-react';
import type { VerificationTier } from '../schemas';
import { useSaveVehicle } from '../lib/use-save-vehicle';

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
  const canSave = isLoggedIn && verificationTier !== 'anonymous';

  const { saved, isSaving, error, toggleSave } = useSaveVehicle({
    vehicleId,
    initialSaved,
    canSave,
  });

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
        onClick={() => void toggleSave()}
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
