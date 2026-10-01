import sanitize from "sanitize-html";

/**
 * Central HTML sanitizer for any user/vendor/CMS-authored rich text that is
 * rendered via `dangerouslySetInnerHTML`.
 *
 * Rich text in EventWizz comes from the TipTap editor (event descriptions,
 * blog posts, CMS pages, FAQs, support/email content). That HTML is stored on
 * the backend and rendered back into customer, vendor, and admin browsers, so
 * it MUST be sanitized at render time to prevent stored XSS
 * (e.g. `<img src=x onerror=...>`, `<svg onload=...>`, `javascript:` links).
 *
 * Implemented with `sanitize-html` (pure JS, no jsdom) so it runs identically
 * in Next.js server components (Vercel serverless) and client components.
 * Allowlist is aligned with what the TipTap starter kit + extensions (link,
 * image, text-align, underline) emit, so legitimate formatting is preserved.
 */

const ALLOWED_TAGS = [
  "p", "br", "hr", "span", "div",
  "strong", "b", "em", "i", "u", "s", "strike", "del", "ins", "mark", "sub", "sup", "small",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "figure", "figcaption",
];

export interface SanitizeHtmlOptions {
  /** Allow images. Default true. Set false for contexts where images are unwanted. */
  allowImages?: boolean;
}

/**
 * Sanitize an HTML string. Returns a safe HTML string suitable for
 * `dangerouslySetInnerHTML`. Never throws — returns "" for nullish input.
 */
export function sanitizeHtml(
  dirty: string | null | undefined,
  options: SanitizeHtmlOptions = {},
): string {
  if (!dirty || typeof dirty !== "string") return "";

  const allowImages = options.allowImages !== false;
  const allowedTags = allowImages
    ? ALLOWED_TAGS
    : ALLOWED_TAGS.filter((t) => t !== "img");

  return sanitize(dirty, {
    allowedTags,
    allowedAttributes: {
      "*": ["class", "style", "title", "data-text-align"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    // Only safe URL schemes; blocks javascript:, data:, vbscript:
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    // script/style/etc. are dropped WITH their text content.
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe"],
    transformTags: {
      // Harden external links against reverse-tabnabbing.
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") {
          attribs.rel = "noopener noreferrer";
        }
        return { tagName, attribs };
      },
    },
  });
}
