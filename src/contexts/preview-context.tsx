"use client";

import React, { createContext, useContext, ReactNode } from "react";

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

// Hook to safely check if we're in preview mode without throwing errors
export function useIsPreviewMode(): boolean {
  try {
    const context = useContext(PreviewContext);
    return context?.isPreviewMode ?? false;
  } catch {
    // Fallback to checking URL if context is not available
    if (typeof window !== "undefined") {
      return window.location.pathname.includes("/preview/");
    }
    return false;
  }
}
