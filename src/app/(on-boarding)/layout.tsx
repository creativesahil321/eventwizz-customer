import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import "@/assets/scss/app.scss";
import { tiemposHeadline } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { ServerContextProvider } from "@/lib/server-context";
import {
  getRequestHost,
  getSubdomainFromDomain,
  fetchServerTheme,
} from "@/lib/server-theme";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Only vendors should access onboarding
  if (session.user.account_type !== "vendor") {
    redirect(`/${session.user.account_type}/dashboard`);
  }

  // If vendor is already onboarded, skip to dashboard
  if (session.user.isOnboarded) {
    redirect("/vendor/dashboard");
  }

  // Get domain information from the request
  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);

  // Fetch actual vendor theme from API
  let vendorTheme = null;
  try {
    vendorTheme = await fetchServerTheme(host);

    if (!vendorTheme) {
      console.warn(
        "Onboarding: Theme fetching failed, using default EventWizz theme"
      );
    }
  } catch (error) {
    console.error("Onboarding: Failed to fetch vendor theme:", error);
  }

  // Fallback theme if vendor theme is not available
  const defaultTheme = {
    colors: {
      primary: "#0F172A",
      secondary: "#64748B",
      header: "#FFFFFF",
      footer: "#0F172A",
      background: "#F8FAFC",
      surface: "#FFFFFF",
      text: "#0F172A",
      textDimmed: "#64748B",
    },
    typography: {
      fontFamily: {
        heading: "'Inter', sans-serif",
        body: "'Inter', sans-serif",
      },
    },
    logo: "/assets/images/logos/eventwizz-logo.png",
    name: "EventWizz",
    contactDetails: {
      phoneNumber: "+1 (123) 456-7890",
    },
  };

  // Use vendor theme if available, otherwise use default
  const themeToUse = vendorTheme || defaultTheme;

  return (
    <ServerContextProvider value={{ theme: themeToUse, host, subdomain }}>
      <section
        className={cn(
          "flex min-h-screen w-full flex-col",
          tiemposHeadline.variable
        )}
      >
        {/* <PreloadAssets /> */}
        {children}
      </section>
    </ServerContextProvider>
  );
}
