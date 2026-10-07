"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { logout } from "@/lib/auth/logout";
import { useEffect, useState } from "react";
import { AuthContent } from "./auth-content";
import { AuthSkeleton } from "./auth-skeleton";
import {
  getSafeCallbackUrl,
  isVendorDoorEntryCallback,
  resolvePostLoginRedirect,
  saveAuthCallbackUrl,
} from "@/lib/auth/safe-callback-url";
import LocationSelectionHeader from "@/app/(public)/vendor/_components/LocationPage/location-selection-header";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { useDomain } from "@/providers/domain-provider/domain-provider";

export function AuthLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const { settings } = useDomain();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSigningOutSecurity, setIsSigningOutSecurity] = useState(false);

  const isSecurityViolation =
    searchParams.get("error") === "security_violation";
  const callbackUrl = searchParams.get("callbackUrl");
  const doorScanReturn = isVendorDoorEntryCallback(callbackUrl)
    ? getSafeCallbackUrl(callbackUrl)
    : null;

  useEffect(() => {
    if (callbackUrl) saveAuthCallbackUrl(callbackUrl);
  }, [callbackUrl]);

  useEffect(() => {
    if (!doorScanReturn) return;
    setIsRedirecting(true);
    router.replace(doorScanReturn);
  }, [doorScanReturn, router]);

  // Safety net: arriving at the login page after a security logout while a
  // session still exists ends it completely (we are already on the login page).
  useEffect(() => {
    if (!isSecurityViolation || status !== "authenticated") return;
    setIsSigningOutSecurity(true);
    logout({ reason: "security_violation", redirectTo: false }).finally(() => {
      setIsSigningOutSecurity(false);
    });
  }, [isSecurityViolation, status]);

  useEffect(() => {
    if (doorScanReturn) return;
    if (
      status === "authenticated" &&
      session?.user &&
      !isSecurityViolation &&
      !isSigningOutSecurity
    ) {
      setIsRedirecting(true);

      const account_type = session.user.account_type;
      const isOnboarded = session.user.isOnboarded;

      router.replace(
        resolvePostLoginRedirect({
          accountType: account_type || "customer",
          isVendorOnboarded: Boolean(isOnboarded),
          callbackUrl,
        }),
      );
    }
  }, [
    session,
    status,
    router,
    isSecurityViolation,
    isSigningOutSecurity,
    callbackUrl,
    doorScanReturn,
  ]);

  if (
    doorScanReturn ||
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

  return (
    <>
      {/* Same solid-theme header as the public home (`--color-header` / `--color-on-header`). */}
      <LocationSelectionHeader
        name={theme?.name || settings?.name}
        logo={theme?.logo || settings?.logo || undefined}
      />
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--color-background)] pt-[60px] font-body md:flex-row">
        <aside className="hidden flex-col border-r border-[var(--color-text)]/8 bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-background))] md:flex md:w-[34%] lg:w-[32%]">
          <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-12">
            <AuthContent callbackUrl={callbackUrl} />
          </div>
        </aside>

        <div className="flex flex-1 flex-col bg-[color-mix(in_srgb,var(--color-text)_4%,var(--color-surface))]">
          <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-16">
            <div className="w-full max-w-[440px]">
              <div className="rounded-xl border border-[var(--color-text)]/6 bg-[var(--color-surface)] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
