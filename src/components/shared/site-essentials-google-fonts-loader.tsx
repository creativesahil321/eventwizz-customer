"use client";

import { useEffect } from "react";
import {
  collectSiteEssentialsGoogleFamilies,
  siteEssentialsGoogleFontsStylesheetHref,
} from "@/lib/site-typography-google-fonts";

type SiteEssentialsGoogleFontsLoaderProps = {
  /** Unique id per surface (e.g. typography preview vs. site preview). */
  linkId: string;
  headingStack?: string | null;
  bodyStack?: string | null;
};

/**
 * Injects a Google Fonts stylesheet for Site Essentials preset families.
 * Web-safe presets do not need this; Google presets only set `font-family` and
 * require loaded files or the browser falls back to generic sans/serif.
 */
export function SiteEssentialsGoogleFontsLoader({
  linkId,
  headingStack,
  bodyStack,
}: SiteEssentialsGoogleFontsLoaderProps) {
  useEffect(() => {
    const families = collectSiteEssentialsGoogleFamilies(
      headingStack,
      bodyStack
    );
    const href = siteEssentialsGoogleFontsStylesheetHref(families);
    const existing = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!href) {
      existing?.remove();
      return;
    }

    if (existing) {
      if (existing.getAttribute("href") !== href) {
        existing.href = href;
      }
      return;
    }

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);

    return () => {
      document.getElementById(linkId)?.remove();
    };
  }, [linkId, headingStack, bodyStack]);

  return null;
}
