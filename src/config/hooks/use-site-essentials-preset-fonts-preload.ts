import { useEffect } from "react";
import { siteEssentialsGoogleFontsStylesheetHref } from "@/lib/site-typography-google-fonts";

const PRESET_GRID_CDN_LINK_PREFIX = "site-essentials-preset-grid-cdn-";
const PRESET_GRID_GOOGLE_LINK_ID = "site-essentials-preset-grid-google-fonts";

/**
 * Injects Google Fonts + CDN stylesheets for Try theme card previews.
 * Pass families/urls from the theme catalog (API) when available.
 */
export function useSiteEssentialsPresetFontsPreload(
  googleFamilies: readonly string[] = [],
  cdnStylesheetUrls: readonly string[] = [],
) {
  const familiesKey = googleFamilies.join("|");
  const cdnKey = cdnStylesheetUrls.join("|");

  useEffect(() => {
    const href = siteEssentialsGoogleFontsStylesheetHref([...googleFamilies]);
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
  }, [familiesKey, googleFamilies]);

  useEffect(() => {
    const hrefs = [...cdnStylesheetUrls];
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
  }, [cdnKey, cdnStylesheetUrls]);
}
