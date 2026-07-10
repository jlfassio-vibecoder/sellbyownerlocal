import { useSaveFavorite } from './use-save-favorite';

interface UseSaveClothingOptions {
  clothingId: string;
  initialSaved?: boolean;
  canSave: boolean;
  fetchOnMount?: boolean;
}

export function useSaveClothing({
  clothingId,
  initialSaved = false,
  canSave,
  fetchOnMount = false,
}: UseSaveClothingOptions) {
  return useSaveFavorite({
    itemId: clothingId,
    category: 'clothing',
    initialSaved,
    canSave,
    fetchOnMount,
  });
}
