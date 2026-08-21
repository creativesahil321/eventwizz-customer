import type { CSSProperties } from "react";
import {
  darkenHex,
  pickHeroOverlayColor,
  pickReadableForeground,
} from "@/lib/color-contrast";
import type { SiteEssentialsFormValues } from "./schema";

/** CSS variable bundle for Site Essentials / onboarding live preview roots. */
export function siteEssentialsToPreviewRootStyle(
  formValues: SiteEssentialsFormValues,
): CSSProperties {
  const primary = formValues.colors?.primary || "#0F172A";
  const secondary = formValues.colors?.secondary || "#64748B";
  const header = formValues.colors?.header || "#FFFFFF";
  const footer = formValues.colors?.footer || "#0F172A";
  const background = formValues.colors?.background || "#F8FAFC";
  const surface = formValues.colors?.surface || "#FFFFFF";
  const text = formValues.colors?.text || "#0F172A";
  const textDimmed = formValues.colors?.textDimmed || "#64748B";

  return {
    "--color-primary": primary,
    "--color-secondary": secondary,
    "--color-header": header,
    "--color-footer": footer,
    "--color-hero-overlay": pickHeroOverlayColor(header, footer),
    "--color-background": background,
    "--color-text": text,
    "--color-text-dimmed": textDimmed,
    "--color-surface": surface,
    /** Subtle dividers in package cards etc. (matches public pages using `--color-border`). */
    "--color-border": `color-mix(in srgb, ${text} 18%, transparent)`,
    "--color-primary-hover": darkenHex(primary),
    "--color-primary-focus": primary,
    "--color-primary-foreground": pickReadableForeground(primary),
    "--color-secondary-hover": darkenHex(secondary),
    "--color-secondary-focus": secondary,
    "--color-secondary-foreground": pickReadableForeground(secondary),
    "--color-on-header": pickReadableForeground(header),
    "--color-on-footer": pickReadableForeground(footer),
    "--color-on-surface": pickReadableForeground(surface),
    "--color-on-background": pickReadableForeground(background),
    "--font-heading":
      formValues.typography?.fontFamily?.heading || "'Inter', sans-serif",
    "--font-body":
      formValues.typography?.fontFamily?.body || "'Inter', sans-serif",
    fontFamily: "var(--font-body)",
  } as CSSProperties;
}
