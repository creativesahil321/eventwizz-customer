/**
 * Layout overrides for content inside `@container/preview` (device switcher).
 * Viewport `sm:`/`md:` still apply on a wide monitor, so without these a 390px
 * Mobile frame keeps desktop rows/grids and crushes text (e.g. vertical letters).
 *
 * Thresholds match live breakpoints: `md` = 768px, `sm` = 640px.
 * Live pages have no named `preview` container — these utilities are no-ops there.
 *
 * The Mobile device frame is 390px. Tailwind `@sm` containers are 24rem (384px),
 * so `@max-sm/preview` never matches that frame — use `@max-md/preview` or
 * `usePreviewMobileLayout()` class overrides instead.
 */
export const previewStackUntilMd =
  "@max-md/preview:!flex-col @max-md/preview:!items-stretch";

export const previewFullWidthUntilMd = "@max-md/preview:!w-full";

export const previewGridCols1UntilMd = "@max-md/preview:!grid-cols-1";

/**
 * Phone-only chrome: live `md:hidden`, plus a preview-frame override so a
 * 390px device on a wide monitor still shows (viewport `md:` would hide it).
 */
export const previewFlexOnlyUntilMd =
  "flex md:hidden @max-md/preview:!flex";

/**
 * Tablet/desktop chrome: live `hidden md:flex`, hidden again inside a phone
 * preview frame where viewport `md:` would otherwise keep it visible.
 */
export const previewFlexFromMd = "hidden md:flex @max-md/preview:!hidden";

/**
 * Tailwind *container* `@lg` is 32rem (512px), not viewport `lg` (1024px).
 * Using `@lg/preview` on a ~800px onboarding “Desktop” panel still showed the
 * full header, so Event brochure / Log In overlapped a wide wordmark.
 *
 * `@5xl/preview` = 64rem = 1024px (viewport `lg`)
 * `@7xl/preview` = 80rem = 1280px (viewport `xl`)
 *
 * Full 3-column header only at `@7xl` — small desktop side panels use hamburger.
 */
export const previewDesktopHeaderFlex = "hidden @7xl/preview:flex";
export const previewDesktopHeaderHidden = "@7xl/preview:hidden";
/** Text labels next to header icons — only when the frame is truly wide. */
export const previewDesktopActionLabel = "hidden @7xl/preview:inline";
export const previewDesktopIconAction =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center gap-0 !px-0 @7xl/preview:h-auto @7xl/preview:w-auto @7xl/preview:gap-1.5 @7xl/preview:!px-3";
export const previewBrowseIconVisibility =
  "h-4 w-4 shrink-0 @7xl/preview:hidden";
export const previewLogoSizeClass =
  "max-h-11 max-w-[min(100%,9.5rem)] w-auto object-contain @7xl/preview:max-h-12 @7xl/preview:max-w-[min(100%,11rem)]";
export const previewDesktopActionsRowClass =
  "relative z-0 flex min-w-0 w-1/3 flex-nowrap items-center justify-end gap-1 overflow-visible text-xs @7xl/preview:gap-1.5 @7xl/preview:text-sm";

/** Match live mobile gallery (2 cols below md) inside narrow preview frames. */
export const previewGalleryUntilMd = "@max-md/preview:!grid-cols-2";

/** Drink cards use `sm:flex-row` on live — stack below sm in preview frames. */
export const previewCardStackUntilSm =
  "@max-sm/preview:!flex-col @max-sm/preview:!items-stretch @max-sm/preview:!gap-3";

export const previewStackUntilSm =
  "@max-sm/preview:!flex-col @max-sm/preview:!items-stretch";

export const previewGridCols1UntilSm = "@max-sm/preview:!grid-cols-1";

export const previewHideUntilSm = "@max-sm/preview:!hidden";

/**
 * LocationSearchBar on live is `flex-col` below `sm`. Preview frames sit in a
 * wide window, so `sm:flex-row` / `sm:rounded-full` still apply unless we lock.
 */
export const previewSearchFormUntilSm =
  "@max-sm/preview:!rounded-xl @max-sm/preview:!p-1";

export const previewSearchStackUntilSm =
  "@max-sm/preview:!flex-col @max-sm/preview:!items-stretch @max-sm/preview:!gap-1";

export const previewSearchFieldsUntilSm = "@max-sm/preview:!grid";

export const previewSearchFieldsMultiUntilSm =
  "@max-sm/preview:!grid-cols-2";

export const previewSearchFieldsLocationUntilSm =
  "@max-sm/preview:!grid-cols-[minmax(0,1fr)_auto]";

export const previewSearchSubmitUntilSm = "@max-sm/preview:!h-10 @max-sm/preview:!px-3";

export const previewSearchSubmitFullUntilSm =
  "@max-sm/preview:!col-span-2 @max-sm/preview:!h-10";
