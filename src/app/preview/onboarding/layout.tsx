import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import "@/assets/css/tailwind.css";
import { ServerContextProvider } from "@/lib/server-context";
import { getRequestHost, getSubdomainFromDomain } from "@/lib/server-theme";
import { ThemeSchema } from "@/types/theme.types";

const ONBOARDING_PREVIEW_THEME: ThemeSchema = {
  logo: "/assets/images/logos/eventwizz-logo.png",
  name: "EventWizz",
};

export default async function OnboardingPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Only vendors should access the onboarding preview
  if (session.user.account_type !== "vendor") {
    redirect(`/${session.user.account_type}/dashboard`);
  }

  // Note: We do NOT guard on session.user.isOnboarded here because
  // by the time step 11 (Domain) redirects to /preview/onboarding, the session
  // already has isOnboarded=true. The onboarding layout itself prevents
  // going back to onboarding once isOnboarded is set.

  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);

  return (
    <ServerContextProvider
      value={{
        theme: ONBOARDING_PREVIEW_THEME,
        host,
        subdomain,
      }}
    >
      <div className="onboarding-preview-shell min-h-screen w-full">
        {children}
      </div>
    </ServerContextProvider>
  );
}
