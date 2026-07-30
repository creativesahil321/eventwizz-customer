"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { VendorPublicLocationBookNow } from "@/components/shared/vendor-public-location-book-now";
import { addCacheBusting } from "@/lib/image-utils";
import { useSession } from "next-auth/react";
import { logout } from "@/lib/auth/logout";
import { cn } from "@/lib/utils";
import { useIsPreviewModeFromProvider } from "@/contexts/preview-context";
import {
  usePreviewDeviceFramesEnabled,
  usePreviewNarrowLayout,
} from "@/hooks/use-preview-narrow-layout";

interface LocationSelectionHeaderProps {
  logo?: string;
  name?: string;
}

export default function LocationSelectionHeader({
  logo,
  name,
}: LocationSelectionHeaderProps) {
  const isPreviewMode = useIsPreviewModeFromProvider();
  const deviceFramesEnabled = usePreviewDeviceFramesEnabled();
  const isPreviewNarrow = usePreviewNarrowLayout();
  /** Guest CTAs only in framed onboarding — `/preview/site` mirrors live auth. */
  const forceGuestAuthChrome = isPreviewMode && deviceFramesEnabled;
  /**
   * Framed onboarding scrolls inside the device panel — sticky keeps the header
   * inside the tablet/mobile frame. Live + full-page preview stay viewport-fixed.
   */
  const usesStickyHeader = forceGuestAuthChrome;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const accountType = session?.user?.account_type;
  const needsOnboarding =
    accountType === "vendor" && !session?.user?.isOnboarded;
  const dashboardHref = needsOnboarding
    ? "/on-boarding"
    : accountType
      ? `/${accountType}/dashboard`
      : "/auth/login";
  const dashboardLabel = needsOnboarding
    ? "Continue Onboarding"
    : "Dashboard";

  /** Desktop nav: viewport `md` on live; frame container / narrow store in onboarding. */
  const desktopNavVisibility = isPreviewNarrow
    ? "hidden"
    : deviceFramesEnabled
      ? "hidden @lg/preview:flex"
      : "hidden md:flex";
  const hamburgerVisibility = isPreviewNarrow
    ? "inline-flex"
    : deviceFramesEnabled
      ? "@lg/preview:hidden"
      : "md:hidden";
  const mobileMenuVisibility = isPreviewNarrow
    ? "block"
    : deviceFramesEnabled
      ? "@lg/preview:hidden"
      : "md:hidden";

  const topBarChromeLinkClass = cn(
    "inline-flex items-center justify-center rounded-full border text-sm font-medium transition-colors whitespace-nowrap backdrop-blur-md px-3 py-1",
    "border-[color:color-mix(in_srgb,var(--color-primary)_28%,var(--color-on-header)_16%)]",
    "bg-[color:color-mix(in_srgb,var(--color-header)_72%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--color-header)_82%,transparent)]",
    "text-[var(--color-on-header)]",
    "shadow-[0_12px_28px_-18px_rgba(15,23,42,0.22)]",
    "hover:opacity-95 hover:underline hover:decoration-2 hover:underline-offset-2 hover:decoration-[color:var(--color-primary)]",
  );
  const menuSurfaceChromeLinkClass = cn(
    "inline-flex items-center justify-center rounded-full border text-sm font-medium text-[var(--color-on-header)] transition-colors whitespace-nowrap px-4 py-2 backdrop-blur-sm",
    "border-[color:color-mix(in_srgb,var(--color-primary)_28%,var(--color-on-header)_16%)]",
    "bg-[color:color-mix(in_srgb,var(--color-header)_55%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--color-header)_70%,transparent)]",
    "hover:opacity-95 hover:underline hover:decoration-2 hover:underline-offset-2 hover:decoration-[color:var(--color-primary)]",
  );
  const bookNowMobilePillClass =
    "!rounded-full h-9 gap-1 border-0 px-4 font-semibold shadow-sm";

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        mobileMenuOpen &&
        event.target instanceof Element &&
        !event.target.closest(".mobile-dropdown")
      ) {
        setMobileMenuOpen(false);
      }
    },
    [mobileMenuOpen],
  );

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [handleClickOutside]);

  // Close the drawer when switching Desktop ↔ Tablet/Mobile so chrome stays in sync.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [isPreviewNarrow]);

  const authChrome = (
    forceGuest: boolean,
    surfaceClass: string,
    fullWidth = false,
  ) => {
    if (sessionStatus === "loading") return null;

    if (forceGuest) {
      return (
        <>
          <div
            className={cn(
              surfaceClass,
              "cursor-not-allowed opacity-60",
              fullWidth && "w-full justify-center",
            )}
            aria-hidden
          >
            Log In
          </div>
          <div
            className={cn(
              surfaceClass,
              "cursor-not-allowed opacity-60",
              fullWidth && "w-full justify-center",
            )}
            aria-hidden
          >
            Register
          </div>
        </>
      );
    }

    if (isAuthenticated) {
      return (
        <>
          {isPreviewMode ? (
            <div
              className={cn(
                surfaceClass,
                "cursor-not-allowed opacity-60",
                fullWidth && "w-full justify-center",
              )}
              aria-hidden
            >
              {dashboardLabel}
            </div>
          ) : (
            <Link
              href={dashboardHref}
              className={cn(
                surfaceClass,
                fullWidth && "inline-flex w-full justify-center",
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              {dashboardLabel}
            </Link>
          )}
          {isPreviewMode ? (
            <div
              className={cn(
                surfaceClass,
                "cursor-not-allowed opacity-60",
                fullWidth && "w-full justify-center",
              )}
              aria-hidden
            >
              Log out
            </div>
          ) : (
            <button
              type="button"
              className={cn(
                surfaceClass,
                "cursor-pointer",
                fullWidth && "w-full justify-center text-center",
              )}
              aria-label="Log out"
              onClick={() => {
                setMobileMenuOpen(false);
                void logout();
              }}
            >
              Log out
            </button>
          )}
        </>
      );
    }

    return (
      <>
        <Link
          href="/auth/login"
          className={cn(
            surfaceClass,
            fullWidth && "inline-flex w-full justify-center",
          )}
          onClick={() => setMobileMenuOpen(false)}
        >
          Log In
        </Link>
        <Link
          href="/auth/register"
          className={cn(
            surfaceClass,
            fullWidth && "inline-flex w-full justify-center",
          )}
          onClick={() => setMobileMenuOpen(false)}
        >
          Register
        </Link>
      </>
    );
  };

  return (
    <header
      className={cn(
        "relative z-50 bg-[color:var(--color-header)] shadow-md text-[var(--color-on-header)]",
        usesStickyHeader
          ? "sticky top-0 w-full"
          : "fixed top-0 left-0 right-0",
      )}
    >
      <div className="py-3">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between px-4">
          <motion.div
            className="flex min-w-0 items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isPreviewMode ? (
              <div
                className="inline-flex min-w-0 cursor-default items-center"
                aria-label={name || "Site logo"}
              >
                {logo ? (
                  <div className="flex h-10 items-center md:h-14">
                    <img
                      src={addCacheBusting(logo)}
                      width={200}
                      height={116}
                      className="max-h-10 w-auto max-w-[min(100%,11rem)] object-contain"
                      alt={name || "EventWizz"}
                    />
                  </div>
                ) : (
                  <span className="truncate text-lg font-bold md:text-xl">
                    {name || "EventWizz"}
                  </span>
                )}
              </div>
            ) : (
              <Link
                href="/"
                className="inline-flex min-w-0 items-center"
                aria-label="Home"
              >
                {logo ? (
                  <div className="flex h-10 items-center md:h-14">
                    <img
                      src={addCacheBusting(logo)}
                      width={200}
                      height={116}
                      className="max-h-10 w-auto max-w-[min(100%,11rem)] object-contain"
                      alt={name || "EventWizz"}
                    />
                  </div>
                ) : (
                  <span className="truncate text-lg font-bold md:text-xl">
                    {name || "EventWizz"}
                  </span>
                )}
              </Link>
            )}
          </motion.div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
            <div
              className={cn(
                desktopNavVisibility,
                "items-center gap-3 lg:gap-4",
              )}
            >
              <div className="flex items-center gap-2">
                <VendorPublicLocationBookNow
                  disabled={isPreviewMode}
                  pillGlassOnHero={false}
                  onLocationNavigate={() => setMobileMenuOpen(false)}
                />
              </div>
              {authChrome(forceGuestAuthChrome, topBarChromeLinkClass)}
            </div>

            <button
              type="button"
              className={cn(
                hamburgerVisibility,
                "rounded-full p-2 transition-colors text-[var(--color-on-header)] hover:bg-[var(--color-primary)]/10",
              )}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen ? (
        <motion.div
          className={cn(
            mobileMenuVisibility,
            "absolute top-full left-0 w-full bg-[var(--color-header)]/95 backdrop-blur-sm border-b border-[var(--color-primary)]/30 shadow-lg mobile-dropdown",
          )}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-4 py-4">
            <nav className="mb-4 flex flex-col gap-4">
              <VendorPublicLocationBookNow
                disabled={isPreviewMode}
                pillGlassOnHero={false}
                triggerClassName={cn(
                  "book-now-btn flex w-full items-center justify-center gap-2 font-medium",
                  bookNowMobilePillClass,
                )}
                menuContentClassName="!w-full max-w-none"
                onLocationNavigate={() => {
                  setMobileMenuOpen(false);
                }}
                align="center"
              />
              {authChrome(
                forceGuestAuthChrome,
                menuSurfaceChromeLinkClass,
                true,
              )}
            </nav>
          </div>
        </motion.div>
      ) : null}
    </header>
  );
}
