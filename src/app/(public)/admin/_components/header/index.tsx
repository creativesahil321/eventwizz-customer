"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { ServerContext } from "@/lib/server-context";
import { useSession } from "next-auth/react";
import { addCacheBusting } from "@/lib/image-utils";
import BookACallModal from "../book-a-call-modal";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/how-it-works", label: "How It Works" },
];

export default function AdminHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookCallOpen, setBookCallOpen] = useState(false);
  const { theme } = useContext(ServerContext);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <img
                src={addCacheBusting(logoPath)}
                alt={theme?.name || "EventWizz"}
                className="h-8 w-auto"
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

          <div className="hidden md:flex items-center space-x-4">
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
                href={`/${session?.user?.account_type}/dashboard`}
                className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors"
              >
                Log in
              </Link>
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
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
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
                  <Link href={`/${session?.user?.account_type}/dashboard`}>
                    <Button variant="event-primary" className="w-full">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/auth/login">
                    <Button variant="event-primary" className="w-full">
                      Log in
                    </Button>
                  </Link>
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
