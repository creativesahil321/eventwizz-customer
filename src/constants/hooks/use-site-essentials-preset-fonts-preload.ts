"use client";

import { useEffect } from "react";
import {
  allPresetGridCdnStylesheetUrls,
  allPresetGridGoogleFontFamilies,
} from "@/app/(protected)/_shared/sites-essentials/_lib/site-theme-presets";
import { siteEssentialsGoogleFontsStylesheetHref } from "@/lib/site-typography-google-fonts";

const PRESET_GRID_CDN_LINK_PREFIX = "site-essentials-preset-grid-cdn-";
const PRESET_GRID_GOOGLE_LINK_ID = "site-essentials-preset-grid-google-fonts";

/**
 * Injects one Google Fonts css2 URL (all Site Essentials preset families) plus
 * every preset CDN stylesheet. Use wherever preset font previews render
 * (Theme Presets tab, Try theme sidebar on /preview/site and /preview/event).
 */
export function useSiteEssentialsPresetFontsPreload() {
  useEffect(() => {
    const families = allPresetGridGoogleFontFamilies();
    const href = siteEssentialsGoogleFontsStylesheetHref(families);
    if (!href) return;

    let link = document.getElementById(
      PRESET_GRID_GOOGLE_LINK_ID,
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = PRESET_GRID_GOOGLE_LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) {
      link.href = href;
    }

    return () => {
      document.getElementById(PRESET_GRID_GOOGLE_LINK_ID)?.remove();
    };
  }, []);

  useEffect(() => {
    const hrefs = allPresetGridCdnStylesheetUrls();
    const createdIds: string[] = [];
    hrefs.forEach((href, i) => {
      const id = `${PRESET_GRID_CDN_LINK_PREFIX}${i}`;
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
      createdIds.push(id);
    });
    return () => {
      createdIds.forEach((id) => document.getElementById(id)?.remove());
    };
  }, []);
}
