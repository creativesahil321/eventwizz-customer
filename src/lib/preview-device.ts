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

/** Named CSS container — pair with `@lg/preview:` / `@container/header` in chrome. */
export const PREVIEW_CONTAINER_CLASS = "@container/preview";
