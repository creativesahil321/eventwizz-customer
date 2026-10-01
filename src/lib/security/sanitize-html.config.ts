/**
 * Shared allowlist for the HTML sanitizer.
 *
 * Two implementations read this file so their output matches:
 * - `sanitize-html.ts` (sanitize-html): server components and SSR of client components.
 * - `sanitize-html.browser.ts` (DOMPurify): browser bundles. Swapped in by the
 *   `turbopack.resolveAlias` browser condition in `next.config.ts`, so the
 *   heavy sanitize-html + PostCSS bundle never ships to the client.
 *
 * Keep both implementations in sync with this file when changing the allowlist.
 */

export const ALLOWED_TAGS = [
  "p", "br", "hr", "span", "div",
  "strong", "b", "em", "i", "u", "s", "strike", "del", "ins", "mark", "sub", "sup", "small",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "figure", "figcaption",
];

export const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  "*": ["class", "style", "title", "data-text-align"],
  a: ["href", "target", "rel"],
  img: ["src", "alt", "width", "height", "loading"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
};

/** Only safe URL schemes; blocks javascript:, data:, vbscript:. */
export const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];
export const ALLOWED_IMG_SCHEMES = ["http", "https"];

/** Tags dropped together with their text content. */
export const NON_TEXT_TAGS = ["script", "style", "textarea", "option", "noscript", "iframe"];

/**
 * Inline CSS properties that rich text may use (TipTap text-align plus common
 * pasted formatting). Positioning properties (position, top/left/inset,
 * z-index, transform) are deliberately absent so stored content cannot
 * overlay the page UI.
 */
export const ALLOWED_STYLE_PROPERTIES = [
  "text-align", "color", "background-color",
  "font-weight", "font-style", "font-size", "font-family", "line-height", "letter-spacing",
  "text-decoration", "text-decoration-line", "text-transform", "text-indent",
  "white-space", "vertical-align", "list-style-type",
  "width", "height", "max-width", "min-width", "max-height",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border", "border-width", "border-style", "border-color", "border-collapse", "border-radius",
  "float", "display", "object-fit",
];

/** Values may not call url(), expression() or javascript: */
export const SAFE_STYLE_VALUE = /^(?!.*(?:url|expression|javascript)\s*[(:])[-#%(),./\w\s"'!+]+$/i;
