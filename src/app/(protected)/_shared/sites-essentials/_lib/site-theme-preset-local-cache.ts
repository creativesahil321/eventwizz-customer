import { SITE_THEME_PRESETS, type SiteThemePresetId } from "./site-theme-presets";

const STORAGE_PREFIX = "ew:last-site-theme-preset:";

function storageKey(accountKey: string | undefined): string {
  return `${STORAGE_PREFIX}${accountKey ?? "default"}`;
}

function isKnownPresetId(id: string): id is SiteThemePresetId {
  return id.trim().length > 0;
}

/** Last preset the vendor clicked “Apply preset” for — survives refresh & form reset (browser only). */
export function readLastAppliedSiteThemePresetId(
  accountKey: string | undefined,
): SiteThemePresetId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(accountKey));
    if (!raw || !isKnownPresetId(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writeLastAppliedSiteThemePresetId(
  accountKey: string | undefined,
  id: SiteThemePresetId,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(accountKey), id);
  } catch {
    /* quota / private mode */
  }
}
