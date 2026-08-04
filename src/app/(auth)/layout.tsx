"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useContext, useEffect, useState } from "react";
import { AuthContent } from "./_components/auth-content";
import { ServerContext } from "@/lib/server-context";
import { AuthSkeleton } from "./_components/auth-skeleton";
import { addCacheBusting } from "@/lib/image-utils";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSigningOutSecurity, setIsSigningOutSecurity] = useState(false);
  const { theme } = useContext(ServerContext);

  const isSecurityViolation =
    searchParams.get("error") === "security_violation";
  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";

  useEffect(() => {
    if (!isSecurityViolation || status !== "authenticated") return;
    setIsSigningOutSecurity(true);
    signOut({ redirect: false }).finally(() => {
      setIsSigningOutSecurity(false);
    });
  }, [isSecurityViolation, status]);

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

  if (
    status === "loading" ||
    status === "authenticated" ||
    isRedirecting ||
    isSigningOutSecurity
  ) {
    return (
      <AuthSkeleton
        accountType={session?.user?.account_type}
        isOnboarded={session?.user?.isOnboarded}
      />
    );
  }

  const logo = (
    <Link href="/" className="inline-flex items-center shrink-0">
      <img
        className="h-8 w-auto object-contain"
        alt="EventWizz"
        src={addCacheBusting(logoPath)}
      />
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden font-body bg-[var(--color-background)]">
      {/* Left — brand panel (desktop) */}
      <aside
        className="hidden md:flex md:w-[34%] lg:w-[32%] flex-col border-r border-[var(--color-text)]/8 bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-background))]"
      >
        <div className="px-8 lg:px-12 pt-8 pb-4">{logo}</div>
        <div className="flex flex-1 flex-col justify-center px-8 lg:px-12 pb-12">
          <AuthContent />
        </div>
      </aside>

      {/* Right — form */}
      <div className="flex flex-1 flex-col bg-[color-mix(in_srgb,var(--color-text)_4%,var(--color-surface))]">
        {/* Mobile logo bar — matches page, no separate header color */}
        <header className="md:hidden flex h-14 items-center px-4 border-b border-[var(--color-text)]/8 bg-[var(--color-background)]">
          {logo}
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-16">
          <div className="w-full max-w-[440px]">
            <div className="rounded-xl border border-[var(--color-text)]/6 bg-[var(--color-surface)] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
