import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readJSON, writeJSON } from './storage';

const STORAGE_KEY = 'iris.wishlist.v1';

interface WishlistContextValue {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => boolean;
  remove: (id: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => readJSON<string[]>(STORAGE_KEY, []));
  useEffect(() => writeJSON(STORAGE_KEY, ids), [ids]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback(
    (id: string) => {
      const next = !ids.includes(id);
      setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      return next;
    },
    [ids],
  );
  const remove = useCallback((id: string) => setIds((prev) => prev.filter((x) => x !== id)), []);

  const value = useMemo(() => ({ ids, has, toggle, remove }), [ids, has, toggle, remove]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}
