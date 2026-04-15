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

interface LocationSelectionHeaderProps {
  logo?: string;
  name?: string;
}

export default function LocationSelectionHeader({
  logo,
  name,
}: LocationSelectionHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const accountType = session?.user?.account_type;
  const dashboardHref = accountType ? `/${accountType}/dashboard` : "/auth/login";

  // Match CommonHeader: glass pills over hero; same pill family after scroll.
  const pillGlassOnHero = !isScrolled;
  const overDarkHero = pillGlassOnHero;
  const topBarChromeLinkClass = cn(
    "inline-flex items-center justify-center rounded-full border text-sm font-medium transition-colors whitespace-nowrap backdrop-blur-md px-3 py-1.5",
    pillGlassOnHero
      ? cn(
          "border-[color:color-mix(in_srgb,var(--color-primary)_55%,white_18%)]",
          "bg-white/10 hover:bg-white/15 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]",
          "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)]",
        )
      : cn(
          "border-[color:color-mix(in_srgb,var(--color-primary)_28%,var(--color-on-header)_16%)]",
          "bg-[color:color-mix(in_srgb,var(--color-header)_72%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--color-header)_82%,transparent)]",
          "text-[var(--color-on-header)]",
          "shadow-[0_12px_28px_-18px_rgba(15,23,42,0.22)]",
          "hover:opacity-95 hover:underline hover:decoration-2 hover:underline-offset-2 hover:decoration-[color:var(--color-primary)]",
        ),
  );
  const menuSurfaceChromeLinkClass = cn(
    "inline-flex items-center justify-center rounded-full border text-sm font-medium text-[var(--color-on-header)] transition-colors whitespace-nowrap px-4 py-2 backdrop-blur-sm",
    "border-[color:color-mix(in_srgb,var(--color-primary)_28%,var(--color-on-header)_16%)]",
    "bg-[color:color-mix(in_srgb,var(--color-header)_55%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--color-header)_70%,transparent)]",
    "hover:opacity-95 hover:underline hover:decoration-2 hover:underline-offset-2 hover:decoration-[color:var(--color-primary)]",
  );
  /** Drawer sits on solid header surface — keep primary solid, still rounded-full. */
  const bookNowMobilePillClass =
    "!rounded-full h-9 gap-1 border-0 px-4 font-semibold shadow-sm";

  // Close mobile menu if user clicks outside
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
    // Listen for click events outside the menu to close it
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [handleClickOutside]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-[color:var(--color-header)] shadow-md text-[var(--color-on-header)]"
          : "bg-transparent",
      )}
    >
      {/* Main header — light text over hero; scrolled state uses theme on-header */}
      <div className={cn("py-4", overDarkHero && "text-white")}>
        <div className="container mx-auto flex items-center justify-between px-4">
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="inline-flex items-center" aria-label="Home">
              {logo ? (
                <img
                  src={addCacheBusting(logo)}
                  width={200}
                  height={116}
                  className="h-14 md:h-16 w-auto object-contain max-w-[200px]"
                  alt={name || "EventWizz"}
                />
              ) : (
                <span className="text-xl font-bold">
                  {name || "EventWizz"}
                </span>
              )}
            </Link>
          </motion.div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-3 lg:gap-4">
              <div className="flex items-center gap-2">
                <VendorPublicLocationBookNow
                  pillGlassOnHero={pillGlassOnHero}
                  onLocationNavigate={() => setMobileMenuOpen(false)}
                />
              </div>

              {sessionStatus !== "loading" &&
                (isAuthenticated ? (
                  <>
                    <Link href={dashboardHref} className={topBarChromeLinkClass}>
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      className={cn(topBarChromeLinkClass, "cursor-pointer")}
                      aria-label="Log out"
                      onClick={() => void logout()}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" className={topBarChromeLinkClass}>
                      Log In
                    </Link>
                    <Link
                      href="/auth/register"
                      className={topBarChromeLinkClass}
                    >
                      Register
                    </Link>
                  </>
                ))}
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              className={cn(
                "md:hidden rounded-full p-2 transition-colors",
                pillGlassOnHero
                  ? "border border-[color:color-mix(in_srgb,var(--color-primary)_55%,white_18%)] bg-white/10 text-white backdrop-blur-md hover:bg-white/15 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]"
                  : "text-[var(--color-on-header)] hover:bg-[var(--color-primary)]/10",
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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          className="md:hidden absolute top-full left-0 w-full bg-[var(--color-header)]/95 backdrop-blur-sm border-b border-[var(--color-primary)]/30 shadow-lg mobile-dropdown"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="py-4 px-4">
            <nav className="flex flex-col gap-4 mb-4">
              <VendorPublicLocationBookNow
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

              {sessionStatus !== "loading" &&
                (isAuthenticated ? (
                  <>
                    <Link
                      href={dashboardHref}
                      className={`${menuSurfaceChromeLinkClass} inline-flex w-full justify-center`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      className={cn(
                        menuSurfaceChromeLinkClass,
                        "w-full cursor-pointer justify-center text-center",
                      )}
                      aria-label="Log out"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        void logout();
                      }}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className={`${menuSurfaceChromeLinkClass} inline-flex w-full justify-center`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log In
                    </Link>
                    <Link
                      href="/auth/register"
                      className={`${menuSurfaceChromeLinkClass} inline-flex w-full justify-center`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </>
                ))}
            </nav>
          </div>
        </motion.div>
      )}
    </header>
  );
}
