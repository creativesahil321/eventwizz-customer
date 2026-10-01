import React from "react";
import { sanitizeHtml } from "@/lib/security/sanitize-html";

type SafeHtmlProps<T extends keyof React.JSX.IntrinsicElements = "div"> = {
  /** Raw HTML string (user/vendor/CMS authored). Sanitized before render. */
  html: string | null | undefined;
  /** Element to render as. Defaults to "div". */
  as?: T;
  /** Disallow <img> in this context. */
  allowImages?: boolean;
} & Omit<React.ComponentPropsWithoutRef<T>, "dangerouslySetInnerHTML" | "children">;

/**
 * Renders sanitized rich-text HTML. Drop-in replacement for
 * `<div dangerouslySetInnerHTML={{ __html: value }} />` that first runs the
 * value through DOMPurify (see `sanitizeHtml`) to prevent stored XSS.
 *
 * Works in both server and client components.
 */
export function SafeHtml<T extends keyof React.JSX.IntrinsicElements = "div">({
  html,
  as,
  allowImages,
  ...rest
}: SafeHtmlProps<T>) {
  const Tag = (as ?? "div") as keyof React.JSX.IntrinsicElements;
  const clean = sanitizeHtml(html, { allowImages });
  return React.createElement(Tag, {
    ...rest,
    dangerouslySetInnerHTML: { __html: clean },
  });
}

export default SafeHtml;
