import { Inter } from "next/font/google";

/**
 * App-wide Inter via Google’s variable font (single woff2 pipeline).
 * Replaces nine local TTF weights (~1.3 MB+) that were bundled when `@/lib/fonts` loaded.
 */
export const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  // Inter is only the fallback in the font stacks (var(--font-body, var(--font-inter))).
  // Tenants pick Lato/Playfair/Space Grotesk etc., so preloading Inter ships a
  // ~48 KB woff2 on the critical path that most pages never use.
  preload: false,
});
