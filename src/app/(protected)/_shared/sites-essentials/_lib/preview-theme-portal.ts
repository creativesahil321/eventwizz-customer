import type { CSSProperties } from "react";

/** Mark Site Essentials / onboarding preview roots that scope vendor theme CSS vars. */
export const PREVIEW_THEME_ROOT_ATTR = "data-preview-theme-root";

const PREVIEW_THEME_CSS_VARS = [
  "--color-primary",
  "--color-primary-hover",
  "--color-primary-focus",
  "--color-primary-foreground",
  "--color-secondary",
  "--color-secondary-hover",
  "--color-secondary-focus",
  "--color-secondary-foreground",
  "--color-header",
  "--color-footer",
  "--color-background",
  "--color-surface",
  "--color-text",
  "--color-text-dimmed",
  "--color-border",
  "--color-on-header",
  "--color-on-footer",
  "--color-on-surface",
  "--color-on-background",
  "--font-heading",
  "--font-body",
] as const;

export function findClosestPreviewThemeRoot(
  from: Element | null,
): HTMLElement | null {
  if (!from) return null;
  return from.closest(`[${PREVIEW_THEME_ROOT_ATTR}]`);
}

/**
 * Read vendor theme vars from a scoped preview root so portaled UI (dropdowns,
 * etc. on `document.body`) can reuse them instead of the platform admin theme.
 */
export function readPreviewThemeStyleFromElement(
  el: Element | null,
): CSSProperties | undefined {
  if (!el || typeof window === "undefined") return undefined;
  const cs = getComputedStyle(el);
  const style: Record<string, string> = {};
  let any = false;
  for (const key of PREVIEW_THEME_CSS_VARS) {
    const value = cs.getPropertyValue(key).trim();
    if (value) {
      style[key] = value;
      any = true;
    }
  }
  return any ? (style as CSSProperties) : undefined;
}
