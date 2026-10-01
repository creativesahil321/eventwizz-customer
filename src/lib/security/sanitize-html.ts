import sanitize from "sanitize-html";
import {
  ALLOWED_ATTRIBUTES,
  ALLOWED_IMG_SCHEMES,
  ALLOWED_SCHEMES,
  ALLOWED_STYLE_PROPERTIES,
  ALLOWED_TAGS,
  NON_TEXT_TAGS,
  SAFE_STYLE_VALUE,
} from "./sanitize-html.config";

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
 * This file is the server implementation (sanitize-html, pure JS, no jsdom),
 * used by server components and by the SSR pass of client components.
 * Browser bundles get `sanitize-html.browser.ts` (DOMPurify, same allowlist)
 * via the `turbopack.resolveAlias` browser condition in `next.config.ts`.
 * Allowlist lives in `sanitize-html.config.ts`.
 */

export interface SanitizeHtmlOptions {
  /** Allow images. Default true. Set false for contexts where images are unwanted. */
  allowImages?: boolean;
}

const ALLOWED_STYLES: Record<string, RegExp[]> = Object.fromEntries(
  ALLOWED_STYLE_PROPERTIES.map((prop) => [prop, [SAFE_STYLE_VALUE]]),
);

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
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedStyles: { "*": ALLOWED_STYLES },
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: { img: ALLOWED_IMG_SCHEMES },
    allowProtocolRelative: false,
    // script/style/etc. are dropped WITH their text content.
    nonTextTags: NON_TEXT_TAGS,
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
