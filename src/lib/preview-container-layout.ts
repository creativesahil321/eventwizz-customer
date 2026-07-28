/**
 * Layout overrides for content inside `@container/preview` (device switcher).
 * Viewport `sm:`/`md:` still apply on a wide monitor, so without these a 390px
 * Mobile frame keeps desktop rows/grids and crushes text (e.g. vertical letters).
 *
 * Thresholds match live breakpoints: `md` = 768px, `sm` = 640px.
 * Live pages have no named `preview` container — these utilities are no-ops there.
 */
export const previewStackUntilMd =
  "@max-md/preview:!flex-col @max-md/preview:!items-stretch";

export const previewFullWidthUntilMd = "@max-md/preview:!w-full";

export const previewGridCols1UntilMd = "@max-md/preview:!grid-cols-1";

/** Match live mobile gallery (2 cols below md) inside narrow preview frames. */
export const previewGalleryUntilMd = "@max-md/preview:!grid-cols-2";

/** Drink cards use `sm:flex-row` on live — stack below sm in preview frames. */
export const previewCardStackUntilSm =
  "@max-sm/preview:!flex-col @max-sm/preview:!items-stretch @max-sm/preview:!gap-3";

export const previewStackUntilSm =
  "@max-sm/preview:!flex-col @max-sm/preview:!items-stretch";

export const previewGridCols1UntilSm = "@max-sm/preview:!grid-cols-1";

export const previewHideUntilSm = "@max-sm/preview:!hidden";
