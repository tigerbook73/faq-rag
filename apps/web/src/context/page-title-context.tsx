"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface PageTitleContextValue {
  subtitle: string | null;
  setSubtitle: (title: string | null) => void;
}

const PageTitleContext = createContext<PageTitleContextValue>({
  subtitle: null,
  setSubtitle: () => {},
});

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [subtitle, setSubtitleState] = useState<string | null>(null);
  const setSubtitle = useCallback((t: string | null) => setSubtitleState(t), []);
  return <PageTitleContext.Provider value={{ subtitle, setSubtitle }}>{children}</PageTitleContext.Provider>;
}

export function usePageTitle() {
  return useContext(PageTitleContext);
}
