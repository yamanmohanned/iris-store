import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface UiContextValue {
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  chatOpen: boolean;
  toggleChat: () => void;
  closeChat: () => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

const UiContext = createContext<UiContextValue | null>(null);

/** حالة الواجهة العامة: نافذة البحث، المحادثة المباشرة، قائمة الموبايل. */
export function UiProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  const value = useMemo(
    () => ({ searchOpen, openSearch, closeSearch, chatOpen, toggleChat, closeChat, menuOpen, setMenuOpen }),
    [searchOpen, openSearch, closeSearch, chatOpen, toggleChat, closeChat, menuOpen],
  );
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
