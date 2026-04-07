"use client";

import {
  UserCircle,
  Menu,
  Phone,
  X,
  ImageIcon,
  ShoppingCart,
  Calendar,
  LayoutDashboard,
  LogIn,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useContext, useState, useEffect } from "react";
import { ServerContext } from "@/lib/server-context";
import { LucideIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { ThemeSchema } from "@/types/theme.types";
import CartButton from "./cart-button";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
// import { useIsPreviewMode } from "@/contexts/preview-context"; // Available for future use

// Define icon mapping with proper typing
type IconKey = "phone" | "profile";
const iconComponents: Record<IconKey, LucideIcon> = {
  phone: Phone,
  profile: UserCircle,
};

// Interface for navigation links
interface NavLink {
  icon?: IconKey;
  link: string;
  linkText: string;
}

interface CommonHeaderProps {
  contact_number?: string;
  logo?: string | File | null;
  variant?: "default" | "preview" | "onboarding";
  className?: string;
  hasBackgroundImage?: boolean; // New prop to indicate if there's a background image
  /**
   * When variant is `preview`, add left padding for the floating "Back to Editor" control on `/preview/event`.
   * Set false for embedded previews (e.g. admin event approval) where that button is not shown.
   */
  previewBackButtonOffset?: boolean;
}

export default function CommonHeader({
  contact_number,
  logo,
  variant = "default",
  className = "",
  hasBackgroundImage = false,
  previewBackButtonOffset = true,
}: CommonHeaderProps) {
  const { theme } = useContext(ServerContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  // const isPreviewMode = useIsPreviewMode(); // Currently unused but available for future use

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

  // Handle logo source - support both string URLs and File objects
  const logoSrc =
    typeof logo === "string"
      ? logo
      : logo && typeof logo === "object" && "preview" in logo
        ? logo.preview
        : null;

  // Prioritize passed logo prop over theme logo
  const logoToUse = logoSrc || theme?.logo;
  const logoPath =
    logoToUse &&
    typeof logoToUse === "string" &&
    (logoToUse.startsWith("/") ||
      logoToUse.startsWith("data:") ||
      logoToUse.startsWith("http") ||
      logoToUse.startsWith("https") ||
      logoToUse.startsWith("blob"))
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

  // Determine styling based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case "preview":
        return {
          // Always solid: transparent bar sits over dark hero but still used --color-on-header
          // from the theme token (e.g. light header → dark text) → unreadable. Same in admin review embed.
          container: cn(
            "bg-[color:var(--color-header)]",
            isScrolled ? "shadow-md" : "shadow-sm",
          ),
          textColor: "text-[var(--color-on-header)]",
          borderColor: "border-[color:var(--color-primary)]",
          // Base text must use on-header (not primary): white primary on light header was invisible until hover.
          hoverColor:
            "hover:opacity-90 hover:underline hover:decoration-2 hover:underline-offset-2 hover:decoration-[color:var(--color-primary)]",
        };
      case "onboarding":
        return {
          container: "bg-transparent",
          textColor: hasBackgroundImage ? "text-white" : "text-black",
          borderColor: hasBackgroundImage ? "border-white" : "border-black",
          hoverColor: hasBackgroundImage
            ? "hover:text-white/80"
            : "hover:text-black/80",
        };
      default: {
        // Transparent bar sits over hero (event + location pages): on-header is derived from
        // solid header fill, so dark-on-dark when the bar is clear. Match location-selection-header.
        const overDarkHero = !isScrolled;
        return {
          container: isScrolled
            ? "bg-[color:var(--color-header)] shadow-md"
            : "bg-transparent",
          textColor: overDarkHero
            ? "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]"
            : "text-[var(--color-on-header)]",
          borderColor: "border-[color:var(--color-primary)]",
          hoverColor: overDarkHero
            ? "hover:text-white/90 hover:underline hover:decoration-2 hover:underline-offset-2 hover:decoration-[color:var(--color-primary)]"
            : "hover:opacity-90 hover:underline hover:decoration-2 hover:underline-offset-2 hover:decoration-[color:var(--color-primary)]",
        };
      }
    }
  };

  const styles = getVariantStyles();
  const isOnboardingMode = variant === "onboarding";

  const mobileContactLink = headerData.navLinks.find(
    (item) => item.icon === "phone",
  );
  const mobileAccountLinks = headerData.navLinks.filter(
    (item) => item.icon !== "phone",
  );

  const mobileNavRowClass =
    "flex min-h-12 items-center gap-3 text-[15px] font-medium font-sans text-[var(--color-on-header)]";
  const mobileNavIconWrap =
    "flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-5 [&_svg]:w-5";

  // Prevent navigation during onboarding
  const handleLinkClick = (e: React.MouseEvent) => {
    if (isOnboardingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Avoid dark:bg-background here: it overrides vendor --color-header and causes dark-on-dark
  // chrome when the app shell is in dark mode (e.g. admin event review iframe preview).
  const headerDarkModeBg =
    variant === "onboarding"
      ? "dark:bg-background"
      : "dark:bg-[color:var(--color-header)]";

  return (
    <section
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        styles.container,
        variant !== "default" && styles.textColor,
        headerDarkModeBg,
        className,
      )}
    >
      <div className="container mx-auto">
        {/* Desktop Header */}
        <div
          className={cn(
            "hidden md:flex justify-between items-center py-3",
            variant === "default" && styles.textColor,
          )}
        >
          <div
            className={`flex items-center gap-3 w-1/3 ${
              variant === "preview" && previewBackButtonOffset
                ? "pl-[11.5rem]"
                : ""
            }`}
          >
            {isOnboardingMode ? (
              <div
                className={`text-sm ${styles.textColor} opacity-60 border-2 ${styles.borderColor} rounded-lg px-2 py-1 cursor-not-allowed`}
              >
                {headerData.browseEvent.linkText}
              </div>
            ) : (
              <Link
                href={headerData.browseEvent.link}
                className={cn(
                  "text-sm transition-colors border-2 rounded-lg px-2 py-1",
                  styles.textColor,
                  styles.hoverColor,
                  styles.borderColor,
                )}
              >
                {headerData.browseEvent.linkText}
              </Link>
            )}
          </div>
          <div className="w-1/3 text-center">
            {isOnboardingMode ? (
              <div className="h-14 flex items-center justify-center cursor-default">
                {logoPath ? (
                  <img
                    src={addCacheBusting(logoPath as string)}
                    className="max-h-12 w-auto object-contain"
                    alt={vendorTheme?.name || "EventWizz"}
                  />
                ) : (
                  <div
                    className={`flex items-center gap-2 text-lg font-bold ${styles.textColor}`}
                  >
                    <ImageIcon size={24} />
                    EventWizz
                  </div>
                )}
              </div>
            ) : (
              <Link href="/" aria-label="Home">
                <div className="h-14 flex items-center justify-center">
                  {logoPath ? (
                    <img
                      src={addCacheBusting(logoPath as string)}
                      className="max-h-12 w-auto object-contain"
                      alt={vendorTheme?.name || "EventWizz"}
                    />
                  ) : (
                    <div
                      className={`flex items-center gap-2 text-lg font-bold ${styles.textColor}`}
                    >
                      <ImageIcon size={24} />
                      EventWizz
                    </div>
                  )}
                </div>
              </Link>
            )}
          </div>
          <div
            className={`flex items-center gap-2 sm:gap-3 w-1/3 justify-end text-xs sm:text-sm`}
          >
            {/* Cart Button */}
            {isOnboardingMode ? (
              <div
                className={`flex items-center gap-1 ${styles.textColor} opacity-60 transition-colors border-2 ${styles.borderColor} rounded-lg px-2 py-1 cursor-not-allowed`}
              >
                <ShoppingCart size={16} />
                <span>Cart</span>
              </div>
            ) : (
              <CartButton
                size="sm"
                className={cn(
                  "flex items-center gap-1 transition-colors border-2 rounded-lg px-2 py-1",
                  styles.textColor,
                  styles.hoverColor,
                  styles.borderColor,
                )}
              />
            )}

            {headerData.navLinks.map(({ icon, link, linkText }, index) => {
              const IconComponent = icon ? iconComponents[icon] : null;
              const isPhoneNumber = icon === "phone";

              // Allow phone links even in onboarding mode (tel: links are safe)
              const shouldAllowNavigation =
                isOnboardingMode && !link.startsWith("tel:");

              if (shouldAllowNavigation) {
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-1 ${styles.textColor} opacity-60 border-2 ${styles.borderColor} rounded-lg px-1.5 sm:px-2 py-1 whitespace-nowrap cursor-not-allowed`}
                    title={isPhoneNumber ? linkText : undefined}
                  >
                    {IconComponent && (
                      <IconComponent
                        size={14}
                        className="sm:w-4 sm:h-4 flex-shrink-0"
                      />
                    )}
                    <span
                      className={`${
                        isPhoneNumber ? "text-[10px] sm:text-xs md:text-sm" : ""
                      } ${
                        isPhoneNumber
                          ? "truncate max-w-[80px] sm:max-w-[120px] md:max-w-[160px] lg:max-w-none"
                          : ""
                      }`}
                    >
                      {linkText}
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={index}
                  href={link}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center gap-1 transition-colors border-2 rounded-lg px-1.5 sm:px-2 py-1 whitespace-nowrap",
                    styles.textColor,
                    styles.hoverColor,
                    styles.borderColor,
                  )}
                  title={isPhoneNumber ? linkText : undefined}
                >
                  {IconComponent && (
                    <IconComponent
                      size={14}
                      className="sm:w-4 sm:h-4 flex-shrink-0"
                    />
                  )}
                  <span
                    className={`${
                      isPhoneNumber ? "text-[10px] sm:text-xs md:text-sm" : ""
                    } ${
                      isPhoneNumber
                        ? "truncate max-w-[80px] sm:max-w-[120px] md:max-w-[160px] lg:max-w-none"
                        : ""
                    }`}
                  >
                    {linkText}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center py-3">
          <button
            type="button"
            onClick={toggleMobileMenu}
            className={cn("p-2", !isOnboardingMode && styles.textColor)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            disabled={isOnboardingMode}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="text-center">
            {isOnboardingMode ? (
              <div className="h-10 flex items-center justify-center cursor-default">
                {logoPath ? (
                  <img
                    src={addCacheBusting(logoPath as string)}
                    className="max-h-8 w-auto object-contain"
                    alt={vendorTheme?.name || "EventWizz"}
                  />
                ) : (
                  <div
                    className={`flex items-center gap-2 text-lg font-bold ${styles.textColor}`}
                  >
                    <ImageIcon size={20} />
                    EventWizz
                  </div>
                )}
              </div>
            ) : (
              <Link href="/" aria-label="Home">
                <div className="h-10 flex items-center justify-center">
                  {logoPath ? (
                    <img
                      src={addCacheBusting(logoPath as string)}
                      className="max-h-8 w-auto object-contain"
                      alt={vendorTheme?.name || "EventWizz"}
                    />
                  ) : (
                    <div
                      className={`flex items-center gap-2 text-lg font-bold ${styles.textColor}`}
                    >
                      <ImageIcon size={20} />
                      EventWizz
                    </div>
                  )}
                </div>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile Cart Button */}
            {isOnboardingMode ? (
              <div
                className={`p-2 ${styles.textColor} opacity-60 transition-colors cursor-not-allowed`}
              >
                <ShoppingCart className="h-5 w-5" />
              </div>
            ) : (
              <CartButton
                size="icon"
                className={cn(
                  "p-2 transition-colors",
                  styles.textColor,
                  styles.hoverColor,
                )}
              />
            )}

            {isOnboardingMode ? (
              <div
                className={`p-2 ${styles.textColor} opacity-60 cursor-not-allowed`}
                aria-label="Profile"
              >
                <UserCircle className="h-5 w-5" />
              </div>
            ) : isAuthenticated ? (
              <Link
                href={`/${session?.user?.account_type}/dashboard`}
                className={cn(
                  "p-2 transition-colors",
                  styles.textColor,
                  styles.hoverColor,
                )}
                aria-label="Dashboard"
              >
                <UserCircle className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className={cn(
                  "p-2 transition-colors",
                  styles.textColor,
                  styles.hoverColor,
                )}
                aria-label="Log in"
              >
                <UserCircle className="h-5 w-5" />
              </Link>
            )}
          </div>
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
          className={cn(
            "md:hidden fixed top-0 left-0 z-50 flex h-screen w-[70%] max-w-xs transform flex-col bg-[color:var(--color-header)] text-[var(--color-on-header)] transition-transform duration-300 ease-in-out",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-on-header)]/20 px-4 py-4">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--color-on-header)]/80">
              Menu
            </h2>
            <button
              type="button"
              onClick={toggleMobileMenu}
              aria-label="Close menu"
              className="p-1 text-[var(--color-on-header)]"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav
            className="flex flex-1 flex-col overflow-y-auto px-4 pb-8 font-sans"
            aria-label="Main navigation"
          >
            <div className="flex flex-col divide-y divide-[var(--color-on-header)]/15">
              {isOnboardingMode ? (
                <div
                  className={cn(
                    mobileNavRowClass,
                    "cursor-not-allowed opacity-60",
                  )}
                >
                  <span className={mobileNavIconWrap} aria-hidden>
                    <Calendar />
                  </span>
                  {headerData.browseEvent.linkText}
                </div>
              ) : (
                <Link
                  href={headerData.browseEvent.link}
                  className={cn(
                    mobileNavRowClass,
                    styles.hoverColor,
                    "transition-colors",
                  )}
                  onClick={toggleMobileMenu}
                >
                  <span className={mobileNavIconWrap} aria-hidden>
                    <Calendar />
                  </span>
                  {headerData.browseEvent.linkText}
                </Link>
              )}

              {isOnboardingMode ? (
                <div
                  className={cn(
                    mobileNavRowClass,
                    "cursor-not-allowed opacity-60",
                  )}
                >
                  <span className={mobileNavIconWrap} aria-hidden>
                    <ShoppingCart />
                  </span>
                  Cart
                </div>
              ) : (
                <div onClick={toggleMobileMenu}>
                  <CartButton
                    size="sm"
                    showBadge={false}
                    fullWidth
                    className={cn(
                      mobileNavRowClass,
                      styles.hoverColor,
                      "justify-start rounded-none py-0",
                    )}
                  />
                </div>
              )}

              {mobileAccountLinks.map(({ link, linkText }, index) => {
                const shouldAllowNavigation =
                  isOnboardingMode && !link.startsWith("tel:");

                const AccountIcon =
                  linkText === "Dashboard"
                    ? LayoutDashboard
                    : linkText === "Log In"
                      ? LogIn
                      : linkText === "Register"
                        ? UserPlus
                        : null;

                if (shouldAllowNavigation) {
                  return (
                    <div
                      key={`${link}-${index}`}
                      className={cn(
                        mobileNavRowClass,
                        "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span className={mobileNavIconWrap} aria-hidden>
                        {AccountIcon ? (
                          <AccountIcon />
                        ) : (
                          <span className="block h-5 w-5" />
                        )}
                      </span>
                      {linkText}
                    </div>
                  );
                }

                return (
                  <Link
                    key={`${link}-${index}`}
                    href={link}
                    className={cn(
                      mobileNavRowClass,
                      styles.hoverColor,
                      "transition-colors",
                    )}
                    onClick={(e) => {
                      handleLinkClick(e);
                      toggleMobileMenu();
                    }}
                  >
                    <span className={mobileNavIconWrap} aria-hidden>
                      {AccountIcon ? (
                        <AccountIcon />
                      ) : (
                        <span className="block h-5 w-5" />
                      )}
                    </span>
                    {linkText}
                  </Link>
                );
              })}
            </div>

            {mobileContactLink && (
              <div className="mt-6 border-t border-[var(--color-on-header)]/20 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-header)]/55">
                  Contact
                </p>
                <a
                  href={mobileContactLink.link}
                  className={cn(
                    mobileNavRowClass,
                    "min-h-0 py-1",
                    styles.hoverColor,
                    "transition-colors",
                  )}
                  onClick={toggleMobileMenu}
                >
                  <span className={mobileNavIconWrap} aria-hidden>
                    <Phone />
                  </span>
                  <span className="min-w-0 break-words">
                    {mobileContactLink.linkText}
                  </span>
                </a>
              </div>
            )}
          </nav>
        </div>
      </div>
    </section>
  );
}
