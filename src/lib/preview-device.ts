/**
 * Global preview device presets — shared by onboarding, site, and event previews.
 * Widths match common industry targets (iPhone 14/15, iPad portrait, desktop fluid).
 */
export type PreviewDeviceId = "desktop" | "tablet" | "mobile";

export type PreviewDevicePreset = {
  id: PreviewDeviceId;
  label: string;
  /** CSS width for the preview frame (`100%` = fill available panel). */
  width: string;
  /** Approximate CSS px used for labels / analytics. */
  widthPx: number | null;
  shortLabel: string;
};

export const PREVIEW_DEVICE_PRESETS: Record<
  PreviewDeviceId,
  PreviewDevicePreset
> = {
  desktop: {
    id: "desktop",
    label: "Desktop",
    shortLabel: "Desktop",
    width: "100%",
    widthPx: null,
  },
  tablet: {
    id: "tablet",
    label: "Tablet",
    shortLabel: "Tablet",
    width: "768px",
    widthPx: 768,
  },
  mobile: {
    id: "mobile",
    label: "Mobile",
    shortLabel: "Mobile",
    width: "390px",
    widthPx: 390,
  },
};

export const PREVIEW_DEVICE_ORDER: PreviewDeviceId[] = [
  "desktop",
  "tablet",
  "mobile",
];

export const DEFAULT_PREVIEW_DEVICE: PreviewDeviceId = "desktop";

/** Named CSS container — pair with `@5xl/preview:` (1024px) / `@7xl/preview:` (1280px). */
export const PREVIEW_CONTAINER_CLASS = "@container/preview";

/** Theme tokens live on this node; the device frame (portal host) is outside it. */
export const PREVIEW_THEME_ROOT_SELECTOR = "[data-preview-theme-root]";

const PREVIEW_THEME_VAR_NAMES = [
  "--color-header",
  "--color-on-header",
  "--color-footer",
  "--color-on-footer",
  "--color-surface",
  "--color-text",
  "--color-background",
  "--color-primary",
  "--logo-on-header-filter",
  "--logo-on-footer-filter",
] as const;

/**
 * Copy preview brand tokens from the themed root (or `fromEl`) so a drawer
 * portaled onto `[data-preview-device]` keeps readable header/on-header colors.
 */
export function readPreviewThemeVarStyle(
  fromEl: HTMLElement | null,
): Record<string, string> {
  if (!fromEl || typeof getComputedStyle === "undefined") return {};
  const root =
    fromEl.closest<HTMLElement>(PREVIEW_THEME_ROOT_SELECTOR) ?? fromEl;
  const computed = getComputedStyle(root);
  const style: Record<string, string> = {};
  for (const name of PREVIEW_THEME_VAR_NAMES) {
    const value = computed.getPropertyValue(name).trim();
    if (value) style[name] = value;
  }
  return style;
}

/**
 * Where the mobile nav drawer should mount.
 * Device frame first (onboarding / admin / `/preview/onboarding`), then an
 * embedded scroll panel (dashboard Preview tab), then `document.body` (live
 * site and full-page `/preview/site`) so the drawer is always full-height
 * and above page headings like “Menu”.
 */
export function resolvePreviewMobileMenuHost(
  fromEl: HTMLElement | null,
  embeddedScrollEl?: HTMLElement | null,
): HTMLElement | null {
  const frame =
    fromEl?.closest<HTMLElement>("[data-preview-device]") ??
    embeddedScrollEl?.closest?.("[data-preview-device]") ??
    (typeof document !== "undefined"
      ? document.querySelector<HTMLElement>("[data-preview-device]")
      : null);
  if (frame) return frame;
  if (embeddedScrollEl) return embeddedScrollEl;
  return typeof document !== "undefined" ? document.body : null;
}

/** Lock scroll on the preview frame only — never `document.body` (that clips the onboarding approve bar). */
export function lockPreviewMenuHostScroll(host: HTMLElement): () => void {
  if (typeof document !== "undefined" && host === document.body) {
    return () => undefined;
  }
  const previousOverflowY = host.style.overflowY;
  host.style.overflowY = "hidden";
  return () => {
    host.style.overflowY = previousOverflowY;
  };
}
