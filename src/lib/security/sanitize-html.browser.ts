import DOMPurify, { type DOMPurify as DOMPurifyInstance } from "dompurify";
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
 * Browser implementation of `sanitizeHtml` (see `sanitize-html.ts`).
 *
 * Swapped in for browser bundles by the `turbopack.resolveAlias` browser
 * condition in `next.config.ts`, so client components keep calling
 * `sanitizeHtml` from `@/lib/security/sanitize-html` while the browser uses
 * DOMPurify (native DOM parser, ~20 KB) instead of sanitize-html + PostCSS.
 * Enforces the same allowlist from `sanitize-html.config.ts`.
 */

export interface SanitizeHtmlOptions {
  /** Allow images. Default true. Set false for contexts where images are unwanted. */
  allowImages?: boolean;
}

const GLOBAL_ATTRS = new Set(ALLOWED_ATTRIBUTES["*"] ?? []);
const STYLE_PROPS = new Set(ALLOWED_STYLE_PROPERTIES);
const URI_ATTRS = new Set(["href", "src"]);
const ALL_ATTRS = Array.from(new Set(Object.values(ALLOWED_ATTRIBUTES).flat()));

function isAllowedAttr(tag: string, attr: string): boolean {
  return GLOBAL_ATTRS.has(attr) || (ALLOWED_ATTRIBUTES[tag]?.includes(attr) ?? false);
}

function isAllowedUri(tag: string, value: string): boolean {
  const trimmed = value.trim();
  // Protocol-relative URLs are rejected (allowProtocolRelative: false).
  if (trimmed.startsWith("//") || trimmed.startsWith("\\\\")) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)?.[1]?.toLowerCase();
  if (!scheme) return true; // relative URL
  const allowed = tag === "img" ? ALLOWED_IMG_SCHEMES : ALLOWED_SCHEMES;
  return allowed.includes(scheme);
}

/** Keep only allowlisted declarations, serialized like sanitize-html (`prop:value;prop:value`). */
function filterStyle(style: string): string {
  return style
    .split(";")
    .map((decl) => {
      const idx = decl.indexOf(":");
      if (idx === -1) return null;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      let value = decl.slice(idx + 1).trim();
      const important = /!\s*important$/i.test(value);
      if (important) value = value.replace(/!\s*important$/i, "").trim();
      if (!prop || !value || !STYLE_PROPS.has(prop) || !SAFE_STYLE_VALUE.test(value)) return null;
      return `${prop}:${value}${important ? " !important" : ""}`;
    })
    .filter(Boolean)
    .join(";");
}

let purifier: DOMPurifyInstance | null = null;

function getPurifier(): DOMPurifyInstance | null {
  if (purifier) return purifier;
  if (typeof window === "undefined") return null;
  // Own instance so these hooks never affect other DOMPurify users.
  const instance = DOMPurify(window);
  instance.addHook("uponSanitizeAttribute", (node, data) => {
    const tag = node.nodeName.toLowerCase();
    const attr = data.attrName;
    if (!isAllowedAttr(tag, attr)) {
      data.keepAttr = false;
      return;
    }
    if (URI_ATTRS.has(attr) && !isAllowedUri(tag, data.attrValue)) {
      data.keepAttr = false;
      return;
    }
    if (attr === "style") {
      const filtered = filterStyle(data.attrValue);
      if (filtered) data.attrValue = filtered;
      else data.keepAttr = false;
    }
  });
  instance.addHook("afterSanitizeAttributes", (node) => {
    // Harden external links against reverse-tabnabbing.
    if (node.nodeName.toLowerCase() === "a" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  purifier = instance;
  return instance;
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
  const instance = getPurifier();
  if (!instance) return "";

  const allowImages = options.allowImages !== false;
  const allowedTags = allowImages
    ? ALLOWED_TAGS
    : ALLOWED_TAGS.filter((t) => t !== "img");

  return instance.sanitize(dirty, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ALL_ATTRS,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ADD_FORBID_CONTENTS: NON_TEXT_TAGS,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
}
