/** Recommended max logo width for vendor headers (2x for retina). */
export const LOGO_MAX_WIDTH = 480;

/** Recommended max logo height for vendor headers (2x for retina). */
export const LOGO_MAX_HEIGHT = 120;

/** Pixels at or above this RGB value are treated as header-white background. */
export const LOGO_WHITE_THRESHOLD = 235;

/** Extra tolerance when matching flat bright backgrounds. */
export const LOGO_WHITE_FUZZ = 18;

/**
 * Max RGB Euclidean distance when flood-filling a sampled solid border color
 * (cream, beige, light grey, etc.).
 */
export const LOGO_BORDER_COLOR_DISTANCE = 48;

/** Min share of border pixels that must agree on one color bucket. */
export const LOGO_BORDER_COLOR_CONFIDENCE = 0.55;

/** Pixels at or below this RGB value are treated as flat black background. */
export const LOGO_BLACK_THRESHOLD = 20;

/** Extra tolerance when matching flat dark backgrounds. */
export const LOGO_BLACK_FUZZ = 18;

/** Max upload size accepted by the logo process API (5 MB). */
export const LOGO_PROCESS_MAX_BYTES = 5 * 1024 * 1024;

/** Average luminance above which a logo is treated as "light" on a white header. */
export const LOGO_LIGHT_AVG_LUMINANCE = 195;

/** Min share of opaque pixels that must be bright to invert a light logo. */
export const LOGO_LIGHT_PIXEL_RATIO = 0.65;

/** Min share of opaque pixels that must be low-saturation bright (white/grey marks). */
export const LOGO_LIGHT_MONOCHROME_RATIO = 0.5;

/** Default header color when none is supplied with the upload. */
export const LOGO_DEFAULT_HEADER_BACKGROUND = "#FFFFFF";

/**
 * Wide logos (icon + wordmark) are usually above this width/height ratio.
 * remove.bg often keeps only the icon; we use Sharp edge cleanup instead.
 */
export const LOGO_WIDE_ASPECT_RATIO = 2;

