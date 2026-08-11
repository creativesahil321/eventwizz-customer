"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { VendorPublicLocationBookNow } from "@/components/shared/vendor-public-location-book-now";
import { addCacheBusting } from "@/lib/image-utils";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
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
  const { mediaVersion } = useTheme();
  const logoSrc = logo ? addCacheBusting(logo, mediaVersion) : "";
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

  /**
   * Desktop nav from `lg` so tablet / narrow widths use the hamburger instead of
   * cramming Locations + auth links into ~700px.
   */
  const desktopNavVisibility = isPreviewNarrow
    ? "hidden"
    : deviceFramesEnabled
      ? "hidden @lg/preview:flex"
      : "hidden lg:flex";
  const hamburgerVisibility = isPreviewNarrow
    ? "inline-flex"
    : deviceFramesEnabled
      ? "@lg/preview:hidden"
      : "lg:hidden";
  const mobileMenuVisibility = isPreviewNarrow
    ? "block"
    : deviceFramesEnabled
      ? "@lg/preview:hidden"
      : "lg:hidden";

  const topBarChromeLinkClass = cn(
    "inline-flex h-9 items-center justify-center rounded-full px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 sm:px-3.5",
    "text-[var(--color-on-header)]/90 hover:text-[var(--color-on-header)]",
    "hover:bg-[color:color-mix(in_srgb,var(--color-on-header)_8%,transparent)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-header)]",
  );
  const menuSurfaceChromeLinkClass = cn(
    "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-200",
    // Solid surface so hero/page text cannot show through on mobile.
    "bg-[var(--color-surface)] text-[var(--color-text)]",
    "hover:bg-[color:color-mix(in_srgb,var(--color-text)_6%,var(--color-surface))]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]",
  );

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

  const brandMark = logoSrc ? (
    <div className="flex h-11 items-center lg:h-12">
      <img
        key={logoSrc}
        src={logoSrc}
        width={200}
        height={116}
        className="max-h-11 w-auto max-w-[min(100%,10rem)] object-contain lg:max-h-12 lg:max-w-[min(100%,12rem)]"
        alt={name || "EventWizz"}
      />
    </div>
  ) : (
    <span className="max-w-[10rem] truncate text-base font-bold sm:max-w-[14rem] sm:text-lg lg:text-xl">
      {name || "EventWizz"}
    </span>
  );

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
        "relative z-50 h-[60px] border-b border-[color:color-mix(in_srgb,var(--color-on-header)_8%,transparent)] text-[var(--color-on-header)]",
        // Solid header so scrolled content (e.g. Explore events) never shows through.
        "bg-[var(--color-header)] shadow-[0_8px_28px_-20px_rgba(0,0,0,0.45)]",
        usesStickyHeader
          ? "sticky top-0 w-full"
          : "fixed top-0 left-0 right-0",
      )}
    >
      <div className="mx-auto flex h-full w-full min-w-0 max-w-[1180px] items-center justify-between px-4 sm:px-6">
        <motion.div
          className="flex min-w-0 items-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {isPreviewMode ? (
            <div
              className="inline-flex min-w-0 max-w-full cursor-default items-center gap-2.5"
              aria-label={name || "Site logo"}
            >
              {brandMark}
            </div>
          ) : (
            <Link
              href="/"
              className="inline-flex min-w-0 max-w-full items-center gap-2.5"
              aria-label="Home"
            >
              {brandMark}
            </Link>
          )}
        </motion.div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
          <div
            className={cn(desktopNavVisibility, "items-center gap-2 xl:gap-3")}
          >
            <VendorPublicLocationBookNow
              disabled={isPreviewMode}
              pillGlassOnHero={false}
              onLocationNavigate={() => setMobileMenuOpen(false)}
            />
            {authChrome(forceGuestAuthChrome, topBarChromeLinkClass)}
          </div>

          <button
            type="button"
            className={cn(
              hamburgerVisibility,
              "inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 text-[var(--color-on-header)] hover:bg-[color:color-mix(in_srgb,var(--color-on-header)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]",
            )}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <motion.div
          className={cn(
            mobileMenuVisibility,
            "absolute top-full left-0 w-full border-b border-[color:color-mix(in_srgb,var(--color-on-header)_10%,transparent)] bg-[var(--color-header)] shadow-lg mobile-dropdown",
          )}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-4 py-4">
            <nav className="mb-2 flex flex-col gap-2">
              <VendorPublicLocationBookNow
                disabled={isPreviewMode}
                pillGlassOnHero={false}
                triggerClassName="!h-11 !w-full !rounded-xl !px-4 justify-center font-semibold"
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
