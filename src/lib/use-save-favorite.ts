import { useCallback, useEffect, useState } from 'react';
import type { FavoriteCategory } from '../utils/favorites';

export function saveApiPath(category: FavoriteCategory, itemId: string): string {
  const segment = category === 'vehicle' ? 'vehicles' : 'clothing';
  return `/api/${segment}/${itemId}/save`;
}

interface UseSaveFavoriteOptions {
  itemId: string;
  category: FavoriteCategory;
  initialSaved?: boolean;
  canSave: boolean;
  fetchOnMount?: boolean;
}

export function useSaveFavorite({
  itemId,
  category,
  initialSaved = false,
  canSave,
  fetchOnMount = false,
}: UseSaveFavoriteOptions) {
  const [saved, setSaved] = useState(initialSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiPath = saveApiPath(category, itemId);

  const fetchSavedStatus = useCallback(async () => {
    try {
      const res = await fetch(apiPath, {
        credentials: 'same-origin',
      });

      if (!res.ok) return;

      const data = await res.json();
      setSaved(Boolean(data.saved));
    } catch {
      // Ignore fetch errors for status hydration
    }
  }, [apiPath]);

  useEffect(() => {
    if (fetchOnMount && canSave) {
      void fetchSavedStatus();
    }
  }, [fetchOnMount, canSave, fetchSavedStatus]);

  const toggleSave = useCallback(async () => {
    if (!canSave || isSaving) return;

    const previousSaved = saved;
    setSaved(!previousSaved);
    setError(null);
    setIsSaving(true);

    try {
      const res = await fetch(apiPath, {
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
  }, [canSave, isSaving, saved, apiPath]);

  return { saved, isSaving, error, toggleSave, fetchSavedStatus };
}
