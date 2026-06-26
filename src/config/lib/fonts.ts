import { Inter } from "next/font/google";

/**
 * App-wide Inter via Google’s variable font (single woff2 pipeline).
 * Replaces nine local TTF weights (~1.3 MB+) that were bundled when `@/lib/fonts` loaded.
 */
export const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
