import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { FavoriteItem, VerificationTier } from '../schemas';
import {
  canPersistFavoritesToServer,
  fetchFavoritesFromServer,
  getDeviceFavorites,
  isDeviceFavorite,
  migrateDeviceFavoritesToServer,
  subscribeFavorites,
  toggleLocalFavorite,
  toggleVerifiedFavorite,
} from '../lib/favorites-client';

export interface FavoritesContextValue {
  items: FavoriteItem[];
  count: number;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  persistToServer: boolean;
  isFavorite: (id: string) => boolean;
  toggle: (item: FavoriteItem) => Promise<void>;
  refresh: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export { FavoritesContext };

export interface FavoritesProviderProps {
  isLoggedIn: boolean;
  verificationTier: VerificationTier;
  /** SSR-known saved listing IDs for optimistic heart fill before refresh. */
  initialSavedIds?: string[];
  children: ReactNode;
}

export function FavoritesProvider({
  isLoggedIn,
  verificationTier,
  initialSavedIds = [],
  children,
}: FavoritesProviderProps) {
  const persistToServer = canPersistFavoritesToServer(isLoggedIn, verificationTier);
  const [items, setItems] = useState<FavoriteItem[]>(() => {
    if (typeof window === 'undefined') {
      return initialSavedIds.map((id) => ({
        id,
        title: 'Saved item',
        price: 0,
        category: 'clothing' as const,
        sellerId: 'unknown',
      }));
    }
    return getDeviceFavorites();
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const migratedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (persistToServer) {
      try {
        const serverItems = await fetchFavoritesFromServer();
        setItems(serverItems);
        setError(null);
      } catch (err) {
        console.error('Failed to refresh favorites', err);
        setError(err instanceof Error ? err.message : 'Failed to load favorites');
        // Fall back to device mirror so FAB still works offline-ish.
        setItems(getDeviceFavorites());
      }
      return;
    }

    setItems(getDeviceFavorites());
  }, [persistToServer]);

  // Initial load + guest→account migration for verified sessions.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      try {
        if (persistToServer) {
          setIsSyncing(true);
          if (!migratedRef.current) {
            migratedRef.current = true;
            const deviceItems = getDeviceFavorites();
            if (deviceItems.length > 0) {
              await migrateDeviceFavoritesToServer();
            }
          }
          if (cancelled) return;
          const serverItems = await fetchFavoritesFromServer();
          if (cancelled) return;
          setItems(serverItems);
          setError(null);
        } else {
          migratedRef.current = false;
          if (cancelled) return;
          setItems(getDeviceFavorites());
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Favorites bootstrap failed', err);
        setError(err instanceof Error ? err.message : 'Failed to load favorites');
        setItems(getDeviceFavorites());
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [persistToServer]);

  // Cross-island sync via unified change events.
  useEffect(() => {
    return subscribeFavorites(() => {
      void refresh();
    });
  }, [refresh]);

  const isFavorite = useCallback(
    (id: string) => {
      if (pendingIds.has(id)) {
        // During optimistic toggle, invert current membership briefly handled in toggle.
      }
      if (items.some((item) => item.id === id)) return true;
      // SSR hydration: treat initialSavedIds as saved until refresh completes.
      if (isLoading && initialSavedIds.includes(id)) return true;
      if (!persistToServer) return isDeviceFavorite(id);
      return false;
    },
    [items, pendingIds, isLoading, initialSavedIds, persistToServer]
  );

  const toggle = useCallback(
    async (item: FavoriteItem) => {
      const currentlySaved = isFavorite(item.id);
      setError(null);
      setPendingIds((prev) => new Set(prev).add(item.id));

      // Optimistic UI update.
      setItems((prev) => {
        if (currentlySaved) {
          return prev.filter((entry) => entry.id !== item.id);
        }
        if (prev.some((entry) => entry.id === item.id)) return prev;
        return [...prev, item];
      });

      try {
        if (persistToServer) {
          const result = await toggleVerifiedFavorite(item, currentlySaved);
          if (result.error) {
            setItems((prev) => {
              if (currentlySaved) {
                if (prev.some((entry) => entry.id === item.id)) return prev;
                return [...prev, item];
              }
              return prev.filter((entry) => entry.id !== item.id);
            });
            setError(result.error);
            return;
          }
          setItems((prev) => {
            if (result.saved) {
              if (prev.some((entry) => entry.id === item.id)) return prev;
              return [...prev, item];
            }
            return prev.filter((entry) => entry.id !== item.id);
          });
        } else {
          toggleLocalFavorite(item);
        }
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [isFavorite, persistToServer]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      items,
      count: isLoading
        ? new Set([...items.map((item) => item.id), ...initialSavedIds]).size
        : items.length,
      isLoading,
      isSyncing,
      error,
      persistToServer,
      isFavorite,
      toggle,
      refresh,
    }),
    [
      items,
      isLoading,
      isSyncing,
      error,
      persistToServer,
      isFavorite,
      toggle,
      refresh,
      initialSavedIds,
    ]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

/**
 * Prefer FavoritesProvider context when available.
 * Falls back to a standalone subscription so Astro islands without a shared
 * React tree still stay in sync via favorites-client pub/sub.
 */
export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (ctx) return ctx;
  throw new Error('useFavorites must be used within a FavoritesProvider');
}

/**
 * Standalone hook for islands that cannot share React context.
 * Mirrors FavoritesProvider behavior using favorites-client + local state.
 */
export function useFavoritesStandalone(options: {
  isLoggedIn: boolean;
  verificationTier: VerificationTier;
  initialSavedIds?: string[];
}): FavoritesContextValue {
  return useStandaloneFavorites(options);
}

function useStandaloneFavorites(options: {
  isLoggedIn: boolean;
  verificationTier: VerificationTier;
  initialSavedIds?: string[];
}): FavoritesContextValue {
  const persistToServer = canPersistFavoritesToServer(
    options.isLoggedIn,
    options.verificationTier
  );
  const initialSavedIds = options.initialSavedIds ?? [];
  const [items, setItems] = useState<FavoriteItem[]>(() =>
    typeof window === 'undefined' ? [] : getDeviceFavorites()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const migratedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (persistToServer) {
      try {
        setItems(await fetchFavoritesFromServer());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load favorites');
        setItems(getDeviceFavorites());
      }
      return;
    }
    setItems(getDeviceFavorites());
  }, [persistToServer]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      try {
        if (persistToServer) {
          setIsSyncing(true);
          if (!migratedRef.current) {
            migratedRef.current = true;
            if (getDeviceFavorites().length > 0) {
              await migrateDeviceFavoritesToServer();
            }
          }
          if (!cancelled) {
            setItems(await fetchFavoritesFromServer());
          }
        } else {
          migratedRef.current = false;
          if (!cancelled) setItems(getDeviceFavorites());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load favorites');
          setItems(getDeviceFavorites());
        }
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persistToServer]);

  useEffect(() => subscribeFavorites(() => void refresh()), [refresh]);

  const isFavorite = useCallback(
    (id: string) => {
      if (items.some((item) => item.id === id)) return true;
      if (isLoading && initialSavedIds.includes(id)) return true;
      if (!persistToServer) return isDeviceFavorite(id);
      return false;
    },
    [items, isLoading, initialSavedIds, persistToServer]
  );

  const toggle = useCallback(
    async (item: FavoriteItem) => {
      const currentlySaved = isFavorite(item.id);
      setError(null);
      setItems((prev) => {
        if (currentlySaved) return prev.filter((entry) => entry.id !== item.id);
        if (prev.some((entry) => entry.id === item.id)) return prev;
        return [...prev, item];
      });

      if (persistToServer) {
        const result = await toggleVerifiedFavorite(item, currentlySaved);
        if (result.error) {
          setItems((prev) => {
            if (currentlySaved) {
              if (prev.some((entry) => entry.id === item.id)) return prev;
              return [...prev, item];
            }
            return prev.filter((entry) => entry.id !== item.id);
          });
          setError(result.error);
          return;
        }
        setItems((prev) => {
          if (result.saved) {
            if (prev.some((entry) => entry.id === item.id)) return prev;
            return [...prev, item];
          }
          return prev.filter((entry) => entry.id !== item.id);
        });
      } else {
        toggleLocalFavorite(item);
      }
    },
    [isFavorite, persistToServer]
  );

  return useMemo(
    () => ({
      items,
      count: isLoading
        ? new Set([...items.map((item) => item.id), ...initialSavedIds]).size
        : items.length,
      isLoading,
      isSyncing,
      error,
      persistToServer,
      isFavorite,
      toggle,
      refresh,
    }),
    [
      items,
      isLoading,
      isSyncing,
      error,
      persistToServer,
      isFavorite,
      toggle,
      refresh,
      initialSavedIds,
    ]
  );
}
