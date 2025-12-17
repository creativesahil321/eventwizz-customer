import type { Metadata } from "next";
import "@/assets/css/tailwind.css";
import {
  fetchServerTheme,
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

export const metadata: Metadata = {
  title: appConfig.seo.title,
  description: appConfig.seo.description,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get domain information from the request
  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);

  // Fetch server-side theme data
  let initialTheme = null;
  try {
    initialTheme = await fetchServerTheme(host);

    // If theme fetching fails, we'll use null and let the client-side
    // theme fetching handle it instead
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
