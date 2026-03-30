"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, ChevronDown, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { addCacheBusting } from "@/lib/image-utils";
import { useSession } from "next-auth/react";
import { logout } from "@/lib/auth/logout";

interface LocationSelectionHeaderProps {
  logo?: string;
  name?: string;
}

export default function LocationSelectionHeader({
  logo,
  name,
}: LocationSelectionHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false); // State for controlling dropdown visibility
  const [isScrolled, setIsScrolled] = useState(false);
  const { settings, isLoading: isDomainLoading } = useDomain();
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const accountType = session?.user?.account_type;
  const dashboardHref = accountType ? `/${accountType}/dashboard` : "/auth/login";

  const allLocations = settings?.locations || [];
  const isLoading = isDomainLoading;

  // Match CommonHeader default variant: on-header text + primary border/hover
  const headerChromeLinkClass =
    "text-sm hover:text-[color:var(--color-primary)] transition-colors border-2 border-[color:var(--color-primary)] rounded-lg px-2 py-1 whitespace-nowrap";

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
      if (
        dropdownOpen &&
        event.target instanceof Element &&
        !event.target.closest(".book-now-btn")
      ) {
        setDropdownOpen(false);
      }
    },
    [mobileMenuOpen, dropdownOpen],
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 text-[var(--color-on-header)] ${
        isScrolled
          ? "bg-[color:var(--color-header)] shadow-md"
          : "bg-transparent"
      }`}
    >
      {/* Main header */}
      <div className="py-4">
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
                  className="h-14 md:h-16 w-auto object-contain max-w-[200px]"
                  alt={name || "EventWizz"}
                />
              ) : (
                <span className="text-xl font-bold text-[var(--color-on-header)]">
                  {name || "EventWizz"}
                </span>
              )}
            </Link>
          </motion.div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-3 lg:gap-4">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="event-primary">
                      <span>Book Now</span>
                      <ChevronDown size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[var(--color-header)] border border-[var(--color-primary)] text-[var(--color-on-header)] p-2 rounded-lg shadow-lg w-48">
                    <div className="py-1 px-2 text-xs text-[var(--color-on-header)]/70 border-b border-[var(--color-primary)]/30 mb-1">
                      Select a location
                    </div>
                    {isLoading ? (
                      <div className="py-2 px-2 text-sm text-[var(--color-on-header)]/70">
                        Loading locations...
                      </div>
                    ) : allLocations.length > 0 ? (
                      allLocations.map((location) => {
                        const locationName =
                          "city" in location && location.city
                            ? location.city
                            : "name" in location && location.name
                              ? location.name
                              : "Unknown Location";

                        const locationSlug =
                          "slug" in location && location.slug
                            ? location.slug
                            : "";

                        return (
                          <DropdownMenuItem key={locationSlug} asChild>
                            <Link
                              href={`/${locationSlug}`}
                              className="flex items-center gap-2 py-2 px-2 hover:bg-[var(--color-primary)]/10 rounded-md text-sm cursor-pointer transition-colors"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <MapPin
                                size={14}
                                className="text-[var(--color-on-header)]/70"
                              />
                              <span>{locationName as string}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })
                    ) : (
                      <div className="py-2 px-2 text-sm text-[var(--color-on-header)]/70">
                        No locations available
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {sessionStatus !== "loading" &&
                (isAuthenticated ? (
                  <>
                    <Link href={dashboardHref} className={headerChromeLinkClass}>
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      className={`${headerChromeLinkClass} cursor-pointer bg-transparent text-[var(--color-on-header)] text-left`}
                      aria-label="Log out"
                      onClick={() => void logout()}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" className={headerChromeLinkClass}>
                      Log In
                    </Link>
                    <Link href="/auth/register" className={headerChromeLinkClass}>
                      Register
                    </Link>
                  </>
                ))}
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md hover:bg-[var(--color-primary)]/10 transition-colors text-[var(--color-on-header)]"
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-medium border border-[var(--color-primary)] rounded-lg hover:opacity-90 transition-opacity book-now-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownOpen(!dropdownOpen);
                    }}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen ? "true" : "false"}
                  >
                    Book Now
                    <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                {dropdownOpen && (
                  <DropdownMenuContent className="bg-[var(--color-header)] border border-[var(--color-primary)] text-[var(--color-on-header)] p-2 rounded-lg shadow-lg w-full">
                    <div className="py-1 px-2 text-xs text-[var(--color-on-header)]/70 border-b border-[var(--color-primary)]/30 mb-1">
                      Select a location
                    </div>
                    {isLoading ? (
                      <div className="py-2 px-2 text-sm text-[var(--color-on-header)]/70">
                        Loading locations...
                      </div>
                    ) : allLocations.length > 0 ? (
                      allLocations.map((location) => {
                        const locationName =
                          "city" in location && location.city
                            ? location.city
                            : "name" in location && location.name
                              ? location.name
                              : "Unknown Location";

                        const locationSlug =
                          "slug" in location && location.slug
                            ? location.slug
                            : "";

                        return (
                          <DropdownMenuItem key={locationSlug} asChild>
                            <Link
                              href={`/${locationSlug}`}
                              className="flex items-center gap-2 py-2 px-2 hover:bg-[var(--color-primary)]/10 rounded-md text-sm transition-colors"
                              onClick={() => setDropdownOpen(false)}
                            >
                              <MapPin
                                size={14}
                                className="text-[var(--color-on-header)]/70"
                              />
                              <span>{locationName as string}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })
                    ) : (
                      <div className="py-2 px-2 text-sm text-[var(--color-on-header)]/70">
                        No locations available
                      </div>
                    )}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>

              {sessionStatus !== "loading" &&
                (isAuthenticated ? (
                  <>
                    <Link
                      href={dashboardHref}
                      className={`${headerChromeLinkClass} inline-flex w-full justify-center text-[var(--color-on-header)]`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      className={`${headerChromeLinkClass} w-full cursor-pointer bg-transparent text-center text-[var(--color-on-header)]`}
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
                      className={`${headerChromeLinkClass} inline-flex w-full justify-center text-[var(--color-on-header)]`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log In
                    </Link>
                    <Link
                      href="/auth/register"
                      className={`${headerChromeLinkClass} inline-flex w-full justify-center text-[var(--color-on-header)]`}
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
