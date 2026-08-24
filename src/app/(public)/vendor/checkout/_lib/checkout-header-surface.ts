import {
  getAnchorColor,
  pickReadableForeground,
  relativeLuminance,
} from "@/lib/color-contrast";

const LIGHT_SURFACE = 0.72;

export type CheckoutLogoMarkTone = "light" | "dark" | "unknown";

export type CheckoutHeaderThemeColors = {
  header?: string;
  footer?: string;
  primary?: string;
  text?: string;
};

export function isLightSurface(color: string): boolean {
  try {
    return relativeLuminance(getAnchorColor(color)) >= LIGHT_SURFACE;
  } catch {
    return true;
  }
}

export function firstDarkSurface(
  ...colors: Array<string | null | undefined>
): string {
  for (const color of colors) {
    const trimmed = color?.trim();
    if (trimmed && !isLightSurface(trimmed)) return trimmed;
  }
  return "#0F172A";
}

export function checkoutHeaderForeground(background: string): string {
  return pickReadableForeground(background);
}

/**
 * Match the public site header (`colors.header`), including white bars used
 * with black wordmarks. Only skip a light plate when the logo is a light mark
 * that would disappear on it.
 */
export function resolveCheckoutHeaderSurface(
  colors?: CheckoutHeaderThemeColors | null,
  options?: { logoTone?: CheckoutLogoMarkTone },
): { background: string; foreground: string } {
  const configured = colors?.header?.trim() || "#FFFFFF";
  const logoTone = options?.logoTone ?? "unknown";

  const background =
    logoTone === "light" && isLightSurface(configured)
      ? firstDarkSurface(colors?.footer, colors?.primary, colors?.text)
      : configured;

  return {
    background,
    foreground: checkoutHeaderForeground(background),
  };
}
