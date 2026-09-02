import type { Metadata } from "next";
import "@/assets/css/tailwind.css";
import {
  fetchServerThemeCached,
  generateCriticalThemeCSS,
  getRequestHost,
  getSubdomainFromDomain,
} from "@/lib/server-theme";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { Providers } from "./providers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { getDefaultThemeCSS } from "@/services/common/theme/constants/theme";
import PermissionPreloader from "./permission-preloader";
import { ServerContextProvider } from "@/lib/server-context";
import { appConfig } from "@/config/app";
import { GoogleTagManager } from "@next/third-parties/google";
import {
  googleFontsHrefFromTheme,
  THEME_GOOGLE_FONTS_LINK_ID,
} from "@/lib/site-typography-google-fonts";
import {
  normalizeCustomFontStylesheetUrls,
  THEME_CUSTOM_FONT_STYLESHEET_LINK_ID_PREFIX,
} from "@/lib/site-custom-font-stylesheets";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import { fontInter } from "@/lib/fonts";
import { addCacheBustingSSR, shouldUseNextImageOptimization } from "@/lib/image-utils";
import { resolveVendorMainLandingHeroSrc } from "@/lib/resolve-hero-cover-image";
import { cn } from "@/lib/utils";

/**
 * Dynamic metadata — single source of truth for brand name, favicon, and title template.
 * Both admin and vendor/customer tenants get theme from the settings API; dynamic
 * theme.seo has priority. appConfig is fallback only when API fails or seo is missing.
 *
 * How Next.js title template works:
 *   - `title.default` → used when a child page does NOT set its own title.
 *   - `title.template` → wraps child-page titles, e.g. child sets "Sheffield Events"
 *     and the rendered <title> becomes "Sheffield Events | Wang Deleon".
 */
export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const theme = await fetchServerThemeCached(host);

  const brandName = theme?.name || appConfig.name;

  // Dynamic SEO from API takes priority; fall back to appConfig only when missing
  const titleDefault = theme?.seo?.title || `${brandName} | Event Management`;
  const description =
    theme?.seo?.description || appConfig.seo.description;
  const keywords = theme?.seo?.keywords
    ? (theme.seo.keywords as string).split(",").map((k) => k.trim()).filter(Boolean)
    : appConfig.seo.keywords;

  return {
    title: {
      default: titleDefault,
      template: `%s | ${brandName}`,
    },
    description,
    keywords: keywords.length ? keywords : undefined,
    ...(theme?.favicon && {
      icons: {
        icon: addCacheBustingSSR(theme.favicon, theme.media_updated_at),
        shortcut: addCacheBustingSSR(theme.favicon, theme.media_updated_at),
        apple: addCacheBustingSSR(theme.favicon, theme.media_updated_at),
      },
    }),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get domain information from the request
  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);

  // Reuses the React-cache'd fetch — no second network call.
  let initialTheme = null;
  try {
    initialTheme = await fetchServerThemeCached(host);

    // Falls back to null; client-side theme fetching takes over
    if (!initialTheme) {
      console.warn("SSR theme fetching failed, falling back to CSR fetching");
    }
  } catch (error) {
    console.error("Failed to fetch initial theme:", error);
    // Fallback to null on error, client-side will try again
  }

  // Get session for authentication
  const session = await getServerSession(authOptions);

  // Generate critical CSS or use default
  const criticalThemeCSS = initialTheme
    ? generateCriticalThemeCSS(initialTheme)
    : getDefaultThemeCSS();

  const themeGoogleFontsHref = googleFontsHrefFromTheme(initialTheme);
  const themeCustomFontStylesheetUrls = normalizeCustomFontStylesheetUrls(
    initialTheme?.typography?.customFontStylesheetUrls,
  );

  /**
   * GTM is injected only on the main admin marketing site (website_role === "admin").
   * Vendor and customer tenant sites are intentionally excluded — they have
   * separate analytics needs and should not pollute the EventWizz GTM container.
   *
   * GoogleTagManager from @next/third-parties handles:
   *  - Async script injection (non-blocking, no hydration warnings)
   *  - The <noscript> iframe fallback in <body>
   *  - Proper script strategy for Next.js App Router
   */
  const isAdminSite = initialTheme?.website_role === "admin";

  const vendorHeroPreloadSrc =
    initialTheme && !isAdminSite
      ? resolveVendorMainLandingHeroSrc(initialTheme)
      : null;
  /** Preload raw URL only when next/image is bypassed — otherwise it competes with /_next/image on Slow 4G. */
  const shouldPreloadVendorHero =
    vendorHeroPreloadSrc != null &&
    !shouldUseNextImageOptimization(vendorHeroPreloadSrc);

  return (
    <html
      lang="en"
      suppressHydrationWarning={true}
      className={cn("[scrollbar-gutter:stable]", fontInter.variable)}
      data-heading-emphasis={normalizeHeadingEmphasis(
        initialTheme?.typography?.headingEmphasis,
      )}
    >
      <head suppressHydrationWarning={true}>
        {/* Preload dynamic favicon so it shows immediately instead of after load */}
        {initialTheme?.favicon && (
          <link
            rel="preload"
            href={addCacheBustingSSR(
              initialTheme.favicon,
              initialTheme.media_updated_at,
            )}
            as="image"
            fetchPriority="high"
          />
        )}
        {shouldPreloadVendorHero && vendorHeroPreloadSrc ? (
          <link
            rel="preload"
            href={vendorHeroPreloadSrc}
            as="image"
            fetchPriority="high"
          />
        ) : null}
        {/* Inject critical theme CSS to prevent flickering */}
        <style
          id="critical-theme-css"
          suppressHydrationWarning={true}
          dangerouslySetInnerHTML={{ __html: criticalThemeCSS }}
        />
        {themeGoogleFontsHref ? (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
              rel="preconnect"
              href="https://fonts.gstatic.com"
              crossOrigin="anonymous"
            />
            <link
              id={THEME_GOOGLE_FONTS_LINK_ID}
              rel="stylesheet"
              href={themeGoogleFontsHref}
            />
          </>
        ) : null}
        {themeCustomFontStylesheetUrls.map((href, i) => (
          <link
            key={href}
            id={`${THEME_CUSTOM_FONT_STYLESHEET_LINK_ID_PREFIX}${i}`}
            rel="stylesheet"
            href={href}
          />
        ))}
      </head>
      <body className="antialiased" suppressHydrationWarning={true}>
        <ServerContextProvider value={{ theme: initialTheme, host, subdomain }}>
          <Providers session={session} initialTheme={initialTheme}>
            <PermissionPreloader />
            <NuqsAdapter>{children}</NuqsAdapter>
          </Providers>
        </ServerContextProvider>

        {/* GTM: loaded after app shell — admin site only */}
        {isAdminSite && <GoogleTagManager gtmId="GTM-MJS3VPCZ" />}
      </body>
    </html>
  );
}
