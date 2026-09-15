"use client";

import { usePathname, useSearchParams } from "next/navigation";
import LoginForm from "@/app/(auth)/auth/login/_components/login-form";
import { AuthContent } from "@/app/(auth)/_components/auth-content";
import LocationSelectionHeader from "@/app/(public)/vendor/_components/LocationPage/location-selection-header";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { useDomain } from "@/providers/domain-provider/domain-provider";

export function DoorScanLoginScreen() {
  const { theme } = useTheme();
  const { settings } = useDomain();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const stayUrl = `${pathname}${query ? `?${query}` : ""}`;

  return (
    <>
      <LocationSelectionHeader
        name={theme?.name || settings?.name}
        logo={theme?.logo || settings?.logo || undefined}
      />
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--color-background)] pt-[60px] font-body md:flex-row">
        <aside className="hidden flex-col border-r border-[var(--color-text)]/8 bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-background))] md:flex md:w-[34%] lg:w-[32%]">
          <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-12">
            <AuthContent callbackUrl={stayUrl} />
          </div>
        </aside>

        <div className="flex flex-1 flex-col bg-[color-mix(in_srgb,var(--color-text)_4%,var(--color-surface))]">
          <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-16">
            <div className="w-full max-w-[440px]">
              <div className="rounded-xl border border-[var(--color-text)]/6 bg-[var(--color-surface)] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
                <div className="mb-8 flex flex-col space-y-2 text-center">
                  <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                    Sign in
                  </h1>
                  <p className="text-sm text-[var(--color-text-dimmed)]">
                    Use your venue staff account to open Door Scan
                  </p>
                </div>
                <div className="mx-auto grid w-full max-w-sm gap-6">
                  <LoginForm stayOnPage callbackUrlOverride={stayUrl} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
