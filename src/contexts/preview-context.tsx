"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { usePathname } from "next/navigation";

export type PreviewLocationOption = {
  id?: number;
  slug: string;
  city: string;
  total_events?: number;
};

interface PreviewContextType {
  isPreviewMode: boolean;
  onEventSelect?: (eventSlug: string) => void;
  /** Multi-location site preview: drives header location switcher. */
  previewLocations?: PreviewLocationOption[];
  activePreviewLocationSlug?: string;
  onPreviewLocationSelect?: (slug: string) => void;
}

const PreviewContext = createContext<PreviewContextType | undefined>(undefined);

interface PreviewProviderProps {
  children: ReactNode;
  isPreviewMode?: boolean;
  onEventSelect?: (eventSlug: string) => void;
  previewLocations?: PreviewLocationOption[];
  activePreviewLocationSlug?: string;
  onPreviewLocationSelect?: (slug: string) => void;
}

export function PreviewProvider({
  children,
  isPreviewMode = false,
  onEventSelect,
  previewLocations,
  activePreviewLocationSlug,
  onPreviewLocationSelect,
}: PreviewProviderProps) {
  return (
    <PreviewContext.Provider
      value={{
        isPreviewMode,
        onEventSelect,
        previewLocations,
        activePreviewLocationSlug,
        onPreviewLocationSelect,
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreviewEventSelect():
  | ((eventSlug: string) => void)
  | undefined {
  const context = useContext(PreviewContext);
  return context?.onEventSelect;
}

/** Location switcher data for site / onboarding preview chrome. */
export function usePreviewLocationNavigation() {
  const context = useContext(PreviewContext);
  if (!context) {
    return {
      previewLocations: undefined,
      activePreviewLocationSlug: undefined,
      onPreviewLocationSelect: undefined,
    };
  }
  return {
    previewLocations: context.previewLocations,
    activePreviewLocationSlug: context.activePreviewLocationSlug,
    onPreviewLocationSelect: context.onPreviewLocationSelect,
  };
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (context === undefined) {
    throw new Error("usePreview must be used within a PreviewProvider");
  }
  return context;
}

/**
 * True only when wrapped by `PreviewProvider` with `isPreviewMode`.
 * Unlike `useIsPreviewMode()`, this does **not** treat `/preview/…` URLs as preview —
 * so standalone `/preview/event` can still run authenticated event-detail fetches.
 */
export function useIsPreviewModeFromProvider(): boolean {
  const context = useContext(PreviewContext);
  return context?.isPreviewMode === true;
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
