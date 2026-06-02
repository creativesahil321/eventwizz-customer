import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import "@/assets/scss/app.scss";
import { tiemposHeadline } from "@/lib/fonts-tiempos";
import { cn } from "@/lib/utils";
import { ServerContextProvider } from "@/lib/server-context";
import { getRequestHost, getSubdomainFromDomain } from "@/lib/server-theme";
import { ThemeSchema } from "@/types/theme.types";

/** Admin chrome only (stepper / mode selection) — vendor site preview uses persistence `default_theme`. */
const ONBOARDING_SHELL_THEME: ThemeSchema = {
  logo: "/assets/images/logos/eventwizz-logo.png",
  name: "EventWizz",
};

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

  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);

  return (
    <ServerContextProvider
      value={{
        theme: ONBOARDING_SHELL_THEME,
        host,
        subdomain,
      }}
    >
      <section
        className={cn(
          "flex min-h-screen w-full flex-col",
          tiemposHeadline.variable,
        )}
      >
        {children}
      </section>
    </ServerContextProvider>
  );
}
