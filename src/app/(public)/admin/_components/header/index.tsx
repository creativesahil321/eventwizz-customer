"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { ServerContext } from "@/lib/server-context";
import { useAuthStore } from "@/store/auth.store";
import { addCacheBusting } from "@/lib/image-utils";
import BookACallModal from "../book-a-call-modal";
import { BrandLogoImage } from "@/components/shared/brand-logo-image";
import { PUBLIC_CHROME_CONTAINER_CLASS } from "@/lib/public-rhythm";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/how-it-works", label: "How It Works" },
];

export default function AdminHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookCallOpen, setBookCallOpen] = useState(false);
  const { theme } = useContext(ServerContext);
  // Read auth state from the Zustand store (synced from NextAuth via
  // SessionValidator) instead of useSession() — avoids the
  // "useSession must be wrapped in SessionProvider" crash on public pages.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.account_type);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const needsOnboarding = accountType === "vendor" && !isOnboarded;
  const accountHomeHref = needsOnboarding
    ? "/on-boarding"
    : `/${accountType}/dashboard`;
  const accountHomeLabel = needsOnboarding
    ? "Continue Onboarding"
    : "Dashboard";

  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-[color:var(--color-header)]/90 text-[var(--color-on-header)] backdrop-blur-md z-50 shadow-sm">
        <div
          className={cn(
            PUBLIC_CHROME_CONTAINER_CLASS,
            "flex items-center justify-between py-4",
          )}
        >
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <BrandLogoImage
                src={addCacheBusting(logoPath)}
                alt={theme?.name || "EventWizz"}
                className="h-8 w-auto"
                chrome="header"
              />
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="event-primary"
              size="sm"
              className="rounded-full px-6"
              onClick={() => setBookCallOpen(true)}
            >
              Book a Call
            </Button>

            {isAuthenticated ? (
              <Link
                href={accountHomeHref}
                className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors"
              >
                {accountHomeLabel}
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[color:var(--color-on-header)]/45 bg-transparent px-5 text-[color:var(--color-on-header)] shadow-none hover:bg-[color:var(--color-on-header)]/12 hover:text-[color:var(--color-on-header)]"
                  asChild
                >
                  <Link href="/auth/register">Register</Link>
                </Button>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors"
                >
                  Log in
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[color:var(--color-header)] border-t">
            <div
              className={cn(
                PUBLIC_CHROME_CONTAINER_CLASS,
                "flex flex-col space-y-4 py-4",
              )}
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors py-2 border-b border-[var(--color-on-header)]/15"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="flex flex-col space-y-2 pt-2">
                <Button
                  variant="event-primary"
                  className="w-full rounded-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setBookCallOpen(true);
                  }}
                >
                  Book a Call
                </Button>

                {isAuthenticated ? (
                  <Link href={accountHomeHref}>
                    <Button variant="event-primary" className="w-full">
                      {accountHomeLabel}
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant="outline"
                        className="w-full rounded-full border-[color:var(--color-on-header)]/45 bg-transparent text-[color:var(--color-on-header)] shadow-none hover:bg-[color:var(--color-on-header)]/12 hover:text-[color:var(--color-on-header)]"
                      >
                        Register
                      </Button>
                    </Link>
                    <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="event-primary" className="w-full rounded-full">
                        Log in
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <BookACallModal
        isOpen={bookCallOpen}
        onClose={() => setBookCallOpen(false)}
      />
    </>
  );
}
