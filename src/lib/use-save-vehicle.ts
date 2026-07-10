import { useSaveFavorite } from './use-save-favorite';

interface UseSaveVehicleOptions {
  vehicleId: string;
  initialSaved?: boolean;
  canSave: boolean;
  fetchOnMount?: boolean;
}

export function useSaveVehicle({
  vehicleId,
  initialSaved = false,
  canSave,
  fetchOnMount = false,
}: UseSaveVehicleOptions) {
  return useSaveFavorite({
    itemId: vehicleId,
    category: 'vehicle',
    initialSaved,
    canSave,
    fetchOnMount,
  });
}
