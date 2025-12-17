"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X, Search } from "lucide-react";
import { ServerContext } from "@/lib/server-context";
import { useSession } from "next-auth/react";

export default function AdminHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useContext(ServerContext);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Ensure logo path starts with a forward slash
  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-[color:var(--color-header)]/90 backdrop-blur-md z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center">
            <Image
              src={logoPath}
              alt={theme?.name || "EventWizz"}
              width={110}
              height={30}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            href="/admin/features"
            className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors"
          >
            Features
          </Link>
          <Link
            href="/admin/uses"
            className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors"
          >
            Uses
          </Link>
          <Link
            href="/admin/pricing"
            className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/admin/faqs"
            className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors"
          >
            FAQs
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/auth/register">
            <Button
              variant="event-primary"
              size="sm"
              className="rounded-full px-6"
            >
              Become a Vendor
            </Button>
          </Link>
          <Link
            href="/admin/venues"
            className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors"
          >
            Find Venues
          </Link>

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

          <Button
            variant="ghost"
            size="icon"
            className="ml-2"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileMenu}
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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[color:var(--color-surface)] border-t">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <Link
              href="/admin/features"
              className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors py-2 border-b"
            >
              Features
            </Link>
            <Link
              href="/admin/uses"
              className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors py-2 border-b"
            >
              Uses
            </Link>
            <Link
              href="/admin/pricing"
              className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors py-2 border-b"
            >
              Pricing
            </Link>
            <Link
              href="/admin/faqs"
              className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors py-2 border-b"
            >
              FAQs
            </Link>
            <Link
              href="/admin/venues"
              className="text-sm font-medium hover:text-[color:var(--color-primary)] transition-colors py-2 border-b"
            >
              Find Venues
            </Link>
            <div className="flex flex-col space-y-2 pt-2">
              <Link href="/admin/request-demo">
                <Button variant="event-primary" className="w-full rounded-full">
                  Request Demo
                </Button>
              </Link>

              {isAuthenticated ? (
                <Link href={`/${session?.user?.account_type}/dashboard`}>
                  <Button variant="outline" className="w-full">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    Log in
                  </Button>
                </Link>
              )}

              <Button
                variant="outline"
                className="w-full flex items-center justify-center"
              >
                <Search className="mr-2 h-4 w-4" /> Search
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
