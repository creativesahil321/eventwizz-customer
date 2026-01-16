"use client";

import { Bookmark, Menu, Phone, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useContext, useState, useEffect } from "react";
import { ServerContext } from "@/lib/server-context";
import { LucideIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { ThemeSchema } from "@/types/theme.types";

// Define icon mapping with proper typing
type IconKey = "phone" | "bookmarks";
const iconComponents: Record<IconKey, LucideIcon> = {
  phone: Phone,
  bookmarks: Bookmark,
};

// Interface for navigation links
interface NavLink {
  icon?: IconKey;
  link: string;
  linkText: string;
}

interface HeadersSecProps {
  contact_number?: string;
  logo?: string | null;
}

export default function HeadersSec({
  contact_number,
  logo,
}: HeadersSecProps = {}) {
  const { theme } = useContext(ServerContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cast theme to our known structure
  const vendorTheme = theme as ThemeSchema;

  // Prioritize passed logo prop over theme logo
  const logoToUse = logo || theme?.logo;
  const logoPath =
    logoToUse?.startsWith("/") ||
    logoToUse?.startsWith("data:") ||
    logoToUse?.startsWith("http") ||
    logoToUse?.startsWith("https") ||
    logoToUse?.startsWith("blob")
      ? logoToUse
      : "/assets/images/logos/eventwizz-logo.png";

  // Extract phone number from props, theme, or use default
  const phoneNumber =
    contact_number ||
    (vendorTheme as ThemeSchema & { contactDetails?: { phoneNumber?: string } })
      ?.contactDetails?.phoneNumber ||
    "+1 (123) 456-7890";

  // Define header data using theme
  const headerData = {
    browseEvent: {
      link: "/#",
      linkText: "Browse Events",
    },
    navLinks: [
      {
        icon: "phone" as IconKey,
        link: `tel:${phoneNumber}`,
        linkText: phoneNumber,
      },
      // Only show login button if not authenticated
      ...(isAuthenticated
        ? []
        : [
            {
              link: "/auth/login",
              linkText: "Log In",
            },
          ]),
      // Only show register button if not authenticated
      ...(isAuthenticated
        ? []
        : [{ link: "/auth/register", linkText: "Register" }]),
      // Show dashboard button if authenticated
      ...(isAuthenticated && session?.user?.account_type
        ? [
            {
              link: `/${session.user.account_type}/dashboard`,
              linkText: "Dashboard",
            },
          ]
        : []),
    ] as NavLink[],
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <section
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[color:var(--color-header)] shadow-md"
          : "bg-transparent"
      } text-[var(--color-text)] dark:bg-background`}
    >
      <div className="container mx-auto">
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center py-3">
          <div className="flex items-center gap-3 w-1/3 ">
            <Link
              href={headerData.browseEvent.link}
              className="text-sm hover:text-[color:var(--color-primary)] transition-colors border-2 border-[color:var(--color-primary)] rounded-lg px-2 py-1"
            >
              {headerData.browseEvent.linkText}
            </Link>
          </div>
          <div className="w-1/3 text-center">
            <Link href="/" aria-label="Home">
              <div className="h-14 flex items-center justify-center">
                <Image
                  src={logoPath}
                  width={120}
                  height={40}
                  className="max-h-12 w-auto object-contain"
                  alt={vendorTheme?.name || "EventWizz"}
                  priority
                />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3 w-1/3 justify-end text-sm">
            {headerData.navLinks.map(({ icon, link, linkText }, index) => {
              const IconComponent = icon ? iconComponents[icon] : null;
              return (
                <Link
                  key={index}
                  href={link}
                  className="flex items-center gap-1 hover:text-[color:var(--color-primary)] transition-colors border-2 border-[color:var(--color-primary)] rounded-lg px-2 py-1"
                >
                  {IconComponent && <IconComponent size={16} />}
                  {linkText}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center py-3">
          <button
            onClick={toggleMobileMenu}
            className="p-2"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="text-center">
            <Link href="/" aria-label="Home">
              <div className="h-10 flex items-center justify-center">
                <Image
                  src={logoPath}
                  width={100}
                  height={30}
                  className="max-h-8 w-auto object-contain"
                  alt={vendorTheme?.name || "EventWizz"}
                  priority
                />
              </div>
            </Link>
          </div>
          {isAuthenticated ? (
            <Link
              href={`/${session?.user?.account_type}/dashboard`}
              className="p-2 hover:text-[color:var(--color-primary)] transition-colors"
            >
              <Bookmark className="h-5 w-5" />
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="p-2 hover:text-[color:var(--color-primary)] transition-colors"
            >
              <Bookmark className="h-5 w-5" />
            </Link>
          )}
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={toggleMobileMenu}
          />
        )}

        {/* Mobile Menu Panel */}
        <div
          className={`md:hidden fixed top-0 left-0 w-[70%] max-w-xs h-screen bg-white dark:bg-gray-900 bg-[color:var(--color-surface)] z-50 transform transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="font-heading text-lg">Menu</h2>
            <button onClick={toggleMobileMenu} aria-label="Close menu">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <Link
              href={headerData.browseEvent.link}
              className="block py-2 hover:text-[color:var(--color-primary)]"
              onClick={toggleMobileMenu}
            >
              {headerData.browseEvent.linkText}
            </Link>

            <hr className="border-gray-200" />

            {headerData.navLinks.map(({ icon, link, linkText }, index) => {
              const IconComponent = icon ? iconComponents[icon] : null;
              return (
                <Link
                  key={index}
                  href={link}
                  className="flex items-center gap-2 py-2 hover:text-[color:var(--color-primary)]"
                  onClick={toggleMobileMenu}
                >
                  {IconComponent && <IconComponent size={18} />}
                  {linkText}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
