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

/**
 * Root metadata — two branches:
 *  - Vendor subdomain (theme exists): use vendor brand name/favicon as defaults.
 *    Child pages on the vendor site only need to set their own page title; the
 *    template automatically appends the vendor name.
 *  - Main EventWizz site (no theme): use the doc-specified EventWizz defaults.
 */
export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const theme = await fetchServerThemeCached(host);

  // ── Vendor / customer-facing subdomain ──────────────────────────────────
  if (theme) {
    return {
      metadataBase: new URL(appConfig.url),
      title: {
        default: `${theme.name} | Event Management`,
        template: `%s | ${theme.name}`,
      },
      description: `${theme.name} – event management and online ticketing.`,
      openGraph: {
        type: "website",
        locale: "en_US",
        siteName: theme.name,
        title: `${theme.name} | Event Management`,
        description: `${theme.name} – event management and online ticketing.`,
      },
      twitter: {
        card: "summary_large_image",
        title: `${theme.name} | Event Management`,
        description: `${theme.name} – event management and online ticketing.`,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      icons: {
        icon: theme.favicon,
        shortcut: theme.favicon,
        apple: theme.favicon,
      },
    };
  }

  // ── Main EventWizz site (eventwizz.co.uk) ───────────────────────────────
  return {
    metadataBase: new URL(appConfig.url),
    title: {
      default: appConfig.seo.title,
      template: `%s | EventWizz`,
    },
    description: appConfig.seo.description,
    keywords: appConfig.seo.keywords,
    authors: [{ name: appConfig.author.name, url: appConfig.url }],
    creator: appConfig.author.name,
    publisher: appConfig.author.name,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "/",
      siteName: appConfig.name,
      title: appConfig.seo.title,
      description: appConfig.seo.description,
      images: appConfig.seo.openGraph.images,
    },
    twitter: {
      card: "summary_large_image",
      title: appConfig.seo.title,
      description: appConfig.seo.description,
      images: appConfig.seo.twitter.images,
      creator: "@eventwizz",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: "/",
    },
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

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head suppressHydrationWarning={true}>
        {/* Preload dynamic favicon so it shows immediately instead of after load */}
        {initialTheme?.favicon && (
          <link
            rel="preload"
            href={initialTheme.favicon}
            as="image"
            fetchPriority="high"
          />
        )}
        {/* Inject critical theme CSS to prevent flickering */}
        <style
          id="critical-theme-css"
          suppressHydrationWarning={true}
          dangerouslySetInnerHTML={{ __html: criticalThemeCSS }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning={true}>
        <ServerContextProvider value={{ theme: initialTheme, host, subdomain }}>
          <Providers session={session} initialTheme={initialTheme}>
            <PermissionPreloader />
            <NuqsAdapter>{children}</NuqsAdapter>
          </Providers>
        </ServerContextProvider>
      </body>
    </html>
  );
}
