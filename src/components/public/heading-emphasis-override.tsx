"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";

/**
 * Preview / draft override for `SiteHeading`.
 * Live vendor hosts already have `headingEmphasis` on ThemeProvider.
 * `/preview/site` runs on the platform host, so section titles that only
 * read `useTheme()` would stay Uniform unless this is set from form values.
 */
const HeadingEmphasisOverrideContext = createContext<HeadingEmphasis | null>(
  null,
);

export function HeadingEmphasisOverrideProvider({
  value,
  children,
}: {
  value: HeadingEmphasis | null | undefined;
  children: ReactNode;
}) {
  return (
    <HeadingEmphasisOverrideContext.Provider value={value ?? null}>
      {children}
    </HeadingEmphasisOverrideContext.Provider>
  );
}

export function useHeadingEmphasisOverride(): HeadingEmphasis | null {
  return useContext(HeadingEmphasisOverrideContext);
}
