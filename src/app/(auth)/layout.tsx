"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useContext, useEffect, useState } from "react";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { AuthContent } from "./_components/auth-content";
import { ServerContext } from "@/lib/server-context";
import { AuthSkeleton } from "./_components/auth-skeleton";
import { addCacheBusting } from "@/lib/image-utils";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { website_role } = useDomain();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSigningOutSecurity, setIsSigningOutSecurity] = useState(false);
  const { theme } = useContext(ServerContext);

  const isSecurityViolation = searchParams.get("error") === "security_violation";
  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";
  // Check if the current path is registration-related
  const isRegistrationPage = pathname.includes("/register");

  // Get registration path based on website_role
  const getRegistrationPath = () => {
    if (!website_role) return "/auth/register/customer";

    const paths = {
      admin: "/auth/register/vendor",
      vendor: "/auth/register/customer",
      customer: "/auth/register/customer",
    };

    return (
      paths[website_role as keyof typeof paths] || "/auth/register/customer"
    );
  };

  // When login page has security_violation, clear any stale session so user must re-login (no redirect to welcome)
  useEffect(() => {
    if (!isSecurityViolation || status !== "authenticated") return;
    setIsSigningOutSecurity(true);
    signOut({ redirect: false }).finally(() => {
      setIsSigningOutSecurity(false);
    });
  }, [isSecurityViolation, status]);

  // Redirect authenticated users away from auth pages (skip when security_violation — we sign out above)
  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user &&
      !isSecurityViolation &&
      !isSigningOutSecurity
    ) {
      setIsRedirecting(true);

      const account_type = session.user.account_type;
      const isOnboarded = session.user.isOnboarded;

      if (account_type === "vendor" && !isOnboarded) {
        router.push("/on-boarding");
      } else if (account_type === "vendor") {
        router.replace("/welcome/select-location");
      } else {
        router.replace(`/${account_type}/dashboard`);
      }
    }
  }, [session, status, router, isSecurityViolation, isSigningOutSecurity]);

  // Show fullscreen loader when redirecting after auth or when signing out due to security_violation
  if (status === "authenticated" || isRedirecting || isSigningOutSecurity) {
    return (
      <AuthSkeleton
        accountType={session?.user?.account_type}
        isOnboarded={session?.user?.isOnboarded}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden font-sans bg-[var(--color-background)]">
      <header className="w-full h-16 bg-[var(--color-header)] text-[var(--color-header-foreground,var(--color-foreground))]">
        <div className="max-w-[1400px] h-full mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <img
              className="h-8 w-auto object-contain"
              alt="EventWizz"
              src={addCacheBusting(logoPath)}
            />
          </Link>
          <nav>
            {isRegistrationPage ? (
              <div className="text-sm text-[var(--color-text-dimmed,rgba(0,0,0,0.6))]">
                Have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline cursor-pointer"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <div className="text-sm text-[var(--color-text-dimmed,rgba(0,0,0,0.6))]">
                Don&apos;t have an account?{" "}
                <Link
                  href={getRegistrationPath()}
                  className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline cursor-pointer"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Two-column layout */}
      <main className="flex-grow flex flex-row w-full relative">
        {/* Left column - Pink background with branding */}
        <div className="hidden md:flex md:w-[30%] bg-[var(--color-background)] flex-col">
          <div className="flex flex-col justify-center h-full p-8 lg:pl-24 lg:pr-12">
            <AuthContent />
          </div>
        </div>

        {/* Right column - Light background with form content */}
        <div className="w-full md:w-[70%] bg-[#F2F0EF] flex items-center justify-center">
          <div className="w-full max-w-[600px] px-12 py-20">
            {/* Form content card */}
            <div className="bg-white rounded-lg shadow-lg p-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
