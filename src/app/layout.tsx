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

// Dynamically generate metadata (title, description, favicon) from the vendor's
// saved site essentials so every domain gets its own favicon.
export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const theme = await fetchServerThemeCached(host);

  return {
    title: theme?.name
      ? `${theme.name} | Event Management`
      : appConfig.seo.title,
    description: appConfig.seo.description,
    ...(theme?.favicon && {
      icons: {
        icon: theme.favicon,
        shortcut: theme.favicon,
        apple: theme.favicon,
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
