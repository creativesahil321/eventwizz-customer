"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { usePathname } from "next/navigation";

interface PreviewContextType {
  isPreviewMode: boolean;
}

const PreviewContext = createContext<PreviewContextType | undefined>(undefined);

interface PreviewProviderProps {
  children: ReactNode;
  isPreviewMode?: boolean;
}

export function PreviewProvider({
  children,
  isPreviewMode = false,
}: PreviewProviderProps) {
  return (
    <PreviewContext.Provider value={{ isPreviewMode }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (context === undefined) {
    throw new Error("usePreview must be used within a PreviewProvider");
  }
  return context;
}

/**
 * True when previewing an event/site (provider) or when the URL is under `/preview/…`.
 * Layout-level code (e.g. cart) is not wrapped by PreviewProvider, so the pathname
 * check prevents customer cart APIs from firing on vendor event preview.
 */
export function useIsPreviewMode(): boolean {
  const pathname = usePathname();
  const context = useContext(PreviewContext);
  if (context?.isPreviewMode === true) return true;
  if (pathname?.includes("/preview/")) return true;
  return false;
}
