import {
  getAnchorColor,
  pickReadableForeground,
  relativeLuminance,
} from "@/lib/color-contrast";

const LIGHT_SURFACE = 0.72;

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

/** Brand bar for checkout: never a light plate (vendor logos are usually light). */
export function resolveCheckoutHeaderSurface(
  colors?: CheckoutHeaderThemeColors | null,
): { background: string; foreground: string } {
  const background = firstDarkSurface(
    colors?.header,
    colors?.footer,
    colors?.primary,
    colors?.text,
  );
  return {
    background,
    foreground: checkoutHeaderForeground(background),
  };
}
