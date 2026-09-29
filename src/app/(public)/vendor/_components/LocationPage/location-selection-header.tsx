"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { VendorPublicLocationBookNow } from "@/components/shared/vendor-public-location-book-now";
import { addCacheBusting } from "@/lib/image-utils";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { useSession } from "next-auth/react";
import { logout } from "@/lib/auth/logout";
import { cn } from "@/lib/utils";
import { BrandLogoImage } from "@/components/shared/brand-logo-image";
import { useIsPreviewModeFromProvider } from "@/contexts/preview-context";
import {
  usePreviewDeviceFramesEnabled,
  usePreviewNarrowLayout,
} from "@/hooks/use-preview-narrow-layout";
import {
  previewDesktopHeaderFlex,
  previewDesktopHeaderHidden,
} from "@/lib/preview-container-layout";
import { PUBLIC_CHROME_CONTAINER_CLASS } from "@/lib/public-rhythm";
import { PreviewEditRegion } from "@/components/preview/preview-edit-hint";
import {
  lockPreviewMenuHostScroll,
  resolvePreviewMobileMenuHost,
} from "@/lib/preview-device";
import { PreviewMobileMenuPortal } from "@/components/preview/preview-mobile-menu-portal";
import { GuestAccountMenu } from "@/components/shared/guest-account-menu";

interface LocationSelectionHeaderProps {
  logo?: string;
  name?: string;
  onEditLogo?: () => void;
}

export default function LocationSelectionHeader({
  logo,
  name,
  onEditLogo,
}: LocationSelectionHeaderProps) {
  const isPreviewMode = useIsPreviewModeFromProvider();
  const deviceFramesEnabled = usePreviewDeviceFramesEnabled();
  const isPreviewNarrow = usePreviewNarrowLayout();
  // DB `media_updated_at` (via theme context) — stable SSR/client, busts same-path logo.
  const { mediaVersion } = useTheme();
  const logoSrc = logo ? addCacheBusting(logo, mediaVersion) : "";
  /** Guest Account menu in every preview — match the public customer header. */
  const forceGuestAuthChrome = isPreviewMode;
  /**
   * Preview keeps the header in document flow so it sits under the reserved
   * editor bar (Back / Try theme). Live stays viewport-fixed.
   */
  const usesStickyHeader = isPreviewMode;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuHost, setMenuHost] = useState<HTMLElement | null>(null);
  const headerRootRef = useRef<HTMLElement>(null);
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
   * Full nav from viewport `xl` / container `@7xl` (1280px). Small desktop
   * and tablet use the hamburger — `@lg/preview` is only 512px.
   */
  const desktopNavVisibility = isPreviewNarrow
    ? "hidden"
    : deviceFramesEnabled
      ? previewDesktopHeaderFlex
      : "hidden xl:flex";
  const hamburgerVisibility = isPreviewNarrow
    ? "inline-flex"
    : deviceFramesEnabled
      ? previewDesktopHeaderHidden
      : "xl:hidden";
  const mobileMenuVisibility = isPreviewNarrow
    ? "flex"
    : deviceFramesEnabled
      ? previewDesktopHeaderHidden
      : "xl:hidden";

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

  const resolveMenuHost = () =>
    resolvePreviewMobileMenuHost(headerRootRef.current);

  const toggleMobileMenu = (event?: { stopPropagation(): void }) => {
    event?.stopPropagation();
    if (!mobileMenuOpen) {
      const host = resolveMenuHost();
      if (host) setMenuHost(host);
    }
    setMobileMenuOpen((open) => !open);
  };

  useLayoutEffect(() => {
    if (!mobileMenuOpen) return;
    const host = resolveMenuHost();
    if (host) setMenuHost(host);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen || !menuHost) return;
    return lockPreviewMenuHostScroll(menuHost);
  }, [menuHost, mobileMenuOpen]);

  // Close the drawer when switching Desktop ↔ Tablet/Mobile so chrome stays in sync.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [isPreviewNarrow]);

  const brandMark = logoSrc ? (
    <div className="flex h-11 items-center lg:h-12">
      <BrandLogoImage
        key={logoSrc}
        src={logoSrc}
        width={200}
        height={116}
        className="max-h-11 w-auto max-w-[min(100%,10rem)] object-contain lg:max-h-12 lg:max-w-[min(100%,12rem)]"
        alt={name || "EventWizz"}
      />
    </div>
  ) : (
    <span className="max-w-[10rem] truncate text-base font-bold sm:max-w-[14rem] sm:text-lg lg:text-xl @max-md/preview:!text-base">
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
      if (fullWidth) {
        return (
          <>
            <div
              className={cn(
                surfaceClass,
                "w-full cursor-not-allowed justify-center opacity-60",
              )}
              aria-hidden
            >
              Log In
            </div>
            <div
              className={cn(
                surfaceClass,
                "w-full cursor-not-allowed justify-center opacity-60",
              )}
              aria-hidden
            >
              Register
            </div>
          </>
        );
      }
      return (
        <GuestAccountMenu
          disabled
          triggerClassName={cn(surfaceClass, "cursor-not-allowed gap-1.5 opacity-60")}
        />
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

    if (fullWidth) {
      return (
        <>
          <Link
            href="/auth/login"
            className={cn(surfaceClass, "inline-flex w-full justify-center")}
            onClick={() => setMobileMenuOpen(false)}
          >
            Log In
          </Link>
          <Link
            href="/auth/register"
            className={cn(surfaceClass, "inline-flex w-full justify-center")}
            onClick={() => setMobileMenuOpen(false)}
          >
            Register
          </Link>
        </>
      );
    }

    return (
      <GuestAccountMenu
        triggerClassName={cn(surfaceClass, "gap-1.5")}
        contentClassName="z-[60] min-w-[12rem] overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--color-on-header)_12%,transparent)] bg-[var(--color-header)] p-0 py-1 text-[var(--color-on-header)] shadow-xl"
        itemClassName="mx-1 cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium"
      />
    );
  };

  return (
    <header
      ref={headerRootRef}
      className={cn(
        "relative h-[60px] border-b border-[color:color-mix(in_srgb,var(--color-on-header)_8%,transparent)] text-[var(--color-on-header)]",
        mobileMenuOpen ? "z-0" : "z-50",
        // Solid header so scrolled content (e.g. Explore events) never shows through.
        "bg-[var(--color-header)] shadow-[0_8px_28px_-20px_rgba(0,0,0,0.45)]",
        usesStickyHeader
          ? "sticky top-0 w-full"
          : "fixed top-0 left-0 right-0",
      )}
    >
      <div
        className={cn(
          PUBLIC_CHROME_CONTAINER_CLASS,
          "flex h-full items-center justify-between",
        )}
      >
        <motion.div
          className="flex min-w-0 items-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {isPreviewMode ? (
            onEditLogo ? (
              <PreviewEditRegion
                label="logo"
                onEdit={onEditLogo}
                className="inline-flex min-w-0 max-w-full"
                hoverFrameClassName="rounded-md"
                badgePositionClassName="-right-1 -top-1"
              >
                {brandMark}
              </PreviewEditRegion>
            ) : (
              <div
                className="inline-flex min-w-0 max-w-full cursor-default items-center gap-2.5"
                aria-label={name || "Site logo"}
              >
                {brandMark}
              </div>
            )
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
              "relative z-[90] inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 text-[var(--color-on-header)] hover:bg-[color:color-mix(in_srgb,var(--color-on-header)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]",
            )}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {mobileMenuOpen && menuHost ? (
        <PreviewMobileMenuPortal
          host={menuHost}
          themeFrom={headerRootRef.current}
          onDismiss={() => toggleMobileMenu()}
          panelClassName={mobileMenuVisibility}
        >
          <div className="flex items-center justify-between border-b border-current/20 px-4 py-4">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-current/80">
              Menu
            </h2>
            <button
              type="button"
              onClick={toggleMobileMenu}
              aria-label="Close menu"
              className="p-1"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4"
            aria-label="Main navigation"
          >
            <div className="flex flex-col gap-2">
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
            </div>
          </nav>
        </PreviewMobileMenuPortal>
      ) : null}
    </header>
  );
}
