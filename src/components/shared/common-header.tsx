"use client";

import {
  UserCircle,
  Menu,
  Phone,
  X,
  ImageIcon,
  ShoppingCart,
  MapPin,
  Calendar,
  LayoutDashboard,
  LogIn,
  UserPlus,
  Download,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useContext, useState, useEffect, type RefObject } from "react";
import { ServerContext } from "@/lib/server-context";
import { LucideIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { ThemeSchema } from "@/types/theme.types";
import CartButton from "./cart-button";
import {
  VendorPublicLocationBookNow,
  VendorPublicLocationMobileMenuEntries,
} from "./vendor-public-location-book-now";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { getAnchorColor, relativeLuminance } from "@/lib/color-contrast";
import { useMediaPreviewUrl } from "@/hooks/use-media-preview-url";
import { useIsPreviewModeFromProvider } from "@/contexts/preview-context";
import type { HeaderDownloadLink } from "@/lib/event-header-downloads";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  /** Event PDFs (brochure / FAQ): one icon + dropdown so the bar stays compact */
  headerDownloads?: HeaderDownloadLink[];
  /** Hide “Browse Events” (e.g. event page already has back-to-location in the hero). */
  hideBrowseEvents?: boolean;
  /** Omit the phone pill on desktop only; phone stays under Contact in the mobile drawer. */
  hideHeaderPhone?: boolean;
  /** One “Account” control instead of separate Log in + Register pills (desktop). */
  compactGuestAuth?: boolean;
  /**
   * When the header sits inside a nested scroll panel (onboarding preview), listen here
   * instead of `window` so the floating bar shadow activates on scroll.
   */
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

export default function CommonHeader({
  contact_number,
  logo,
  variant = "default",
  className = "",
  hasBackgroundImage = false,
  previewBackButtonOffset = true,
  headerDownloads,
  hideBrowseEvents = false,
  hideHeaderPhone = false,
  compactGuestAuth = false,
  scrollContainerRef,
}: CommonHeaderProps) {
  const { theme } = useContext(ServerContext);
  const isPreviewFromProvider = useIsPreviewModeFromProvider();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  // const isPreviewMode = useIsPreviewMode(); // Currently unused but available for future use

  // Handle scroll effect (window or embedded preview scroll container)
  useEffect(() => {
    const scrollRoot = scrollContainerRef?.current;

    const handleScroll = () => {
      const scrollTop = scrollRoot ? scrollRoot.scrollTop : window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    handleScroll();
    scrollRoot?.addEventListener("scroll", handleScroll, { passive: true });
    if (!scrollRoot) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      scrollRoot?.removeEventListener("scroll", handleScroll);
      if (!scrollRoot) {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [scrollContainerRef]);

  // Cast theme to our known structure
  const vendorTheme = theme as ThemeSchema;

  // Handle logo source - support string URLs, File blobs, and File.preview
  const resolvedLogoSrc = useMediaPreviewUrl(logo ?? null);

  // Prioritize passed logo prop over theme logo
  const logoToUse = resolvedLogoSrc || theme?.logo;
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

  const desktopNavLinkEntries = headerData.navLinks.filter((l) => {
    if (l.icon === "phone" && hideHeaderPhone) return false;
    if (
      compactGuestAuth &&
      !isAuthenticated &&
      (l.linkText === "Log In" || l.linkText === "Register")
    ) {
      return false;
    }
    return true;
  });

  const showGuestAccountMenu = compactGuestAuth && !isAuthenticated;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  /** Light header themes (e.g. Clean White `#ffffff`) use on-header text — never glass-over-hero. */
  const headerIsLight = (() => {
    const configuredHeader = vendorTheme?.colors?.header ?? "#FFFFFF";
    try {
      return relativeLuminance(getAnchorColor(configuredHeader)) >= 0.88;
    } catch {
      return true;
    }
  })();

  const solidHeaderBarStyles = (scrolled: boolean) => ({
    container: cn(
      "bg-[color:var(--color-header)]",
      scrolled ? "shadow-md" : "shadow-sm",
    ),
    textColor: "text-[var(--color-on-header)]",
    borderColor: "border-[color:var(--color-primary)]",
    hoverColor:
      "hover:opacity-90 hover:underline hover:decoration-2 hover:underline-offset-2 hover:decoration-[color:var(--color-primary)]",
  });

  // Determine styling based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case "preview":
        return solidHeaderBarStyles(isScrolled);
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
        if (headerIsLight) {
          return solidHeaderBarStyles(isScrolled);
        }
        // Dark header: transparent bar over hero until scroll (white nav pills).
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
  /** Glass pills over imagery: dark-header live pages over hero + onboarding homepage with cover. */
  const pillGlassOnHero =
    (variant === "default" && !isScrolled && !headerIsLight) ||
    (variant === "onboarding" && hasBackgroundImage);
  const topBarPillClass = cn(
    "rounded-full border px-3 py-1 text-sm transition-colors whitespace-nowrap backdrop-blur-md",
    pillGlassOnHero
      ? cn(
          "bg-white/10 hover:bg-white/15",
          "border-[color:color-mix(in_srgb,var(--color-primary)_55%,white_18%)]",
          "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)]",
        )
      : cn(
          // Keep pill-shaped controls after scroll (no square fallback).
          "bg-[color:color-mix(in_srgb,var(--color-header)_72%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--color-header)_82%,transparent)]",
          "border-[color:color-mix(in_srgb,var(--color-primary)_28%,var(--color-on-header)_16%)]",
          "shadow-[0_12px_28px_-18px_rgba(15,23,42,0.22)]",
        ),
  );
  const topBarPillDisabledClass = cn(
    topBarPillClass,
    "cursor-not-allowed opacity-60",
  );
  /** Live look (`default`) but no real navigation — e.g. onboarding form preview inside PreviewProvider. */
  const useNonInteractiveChrome =
    variant === "onboarding" ||
    (variant === "default" && isPreviewFromProvider) ||
    (variant === "preview" && isPreviewFromProvider);

  const sessionPending = status === "loading";
  const commerceSlotLoading =
    !useNonInteractiveChrome && sessionPending;
  const showHeaderCart =
    !useNonInteractiveChrome && !sessionPending && isAuthenticated;
  const showGuestLocationSwitcher =
    !useNonInteractiveChrome && !sessionPending && !isAuthenticated;

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

  const handleLinkClick = (e: React.MouseEvent) => {
    if (useNonInteractiveChrome) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const hasHeaderDownloads =
    Array.isArray(headerDownloads) && headerDownloads.length > 0;
  const headerDownloadsList = headerDownloads ?? [];
  const singleHeaderDownload =
    headerDownloadsList.length === 1 ? headerDownloadsList[0] : null;
  const multipleHeaderDownloads = headerDownloadsList.length > 1;

  /** Match glass header pills over hero; solid bar + on-header text when scrolled / preview. */
  const downloadsMenuGlass = pillGlassOnHero;
  const downloadsDropdownContentClass = cn(
    "z-[60] min-w-[13.5rem] overflow-hidden rounded-xl border p-0 py-1 shadow-xl",
    downloadsMenuGlass
      ? cn(
          "border-[color:color-mix(in_srgb,var(--color-primary)_50%,white_24%)]",
          "bg-black/48 text-white ring-1 ring-inset ring-white/10",
          "backdrop-blur-xl backdrop-saturate-150",
          "shadow-[0_24px_56px_-12px_rgba(0,0,0,0.72)]",
        )
      : cn(
          "border-[color:color-mix(in_srgb,var(--color-primary)_32%,var(--color-on-header)_12%)]",
          "bg-[color:color-mix(in_srgb,var(--color-header)_100%,transparent)]",
          "text-[var(--color-on-header)] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--color-on-header)_08%,transparent)]",
          "shadow-[0_20px_44px_-18px_rgba(15,23,42,0.38)]",
        ),
  );
  const downloadsDropdownLabelClass = cn(
    "px-3 pt-2 pb-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em]",
    downloadsMenuGlass ? "text-white/55" : "text-[var(--color-on-header)]/55",
  );
  const downloadsDropdownSeparatorClass = cn(
    "mx-2 my-1.5 h-px",
    downloadsMenuGlass ? "bg-white/12" : "bg-[var(--color-on-header)]/12",
  );
  const downloadsDropdownItemClass = cn(
    "mx-1 cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium outline-none",
    downloadsMenuGlass
      ? cn(
          "text-white/95",
          "focus:bg-white/14 focus:text-white",
          "data-[highlighted]:bg-white/14 data-[highlighted]:text-white",
        )
      : cn(
          "text-[var(--color-on-header)]",
          "focus:bg-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] focus:text-[var(--color-on-header)]",
          "data-[highlighted]:bg-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] data-[highlighted]:text-[var(--color-on-header)]",
        ),
  );
  const downloadsFileIconClass = cn(
    "size-4 shrink-0",
    "text-[color:var(--color-primary)]",
    downloadsMenuGlass
      ? "drop-shadow-[0_0_10px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]"
      : "opacity-90",
  );

  // Avoid dark:bg-background here: it overrides vendor --color-header and causes dark-on-dark
  // chrome when the app shell is in dark mode (e.g. admin event review iframe preview).
  const headerDarkModeBg =
    variant === "onboarding"
      ? "dark:bg-background"
      : "dark:bg-[color:var(--color-header)]";

  /** Nested onboarding/site preview scrolls inside a panel — sticky, not viewport-fixed. */
  const usesEmbeddedScrollPanel = Boolean(scrollContainerRef);

  return (
    <section
      className={cn(
        usesEmbeddedScrollPanel
          ? "sticky top-0 z-50 w-full transition-all duration-300"
          : "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
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
            {!hideBrowseEvents &&
              (useNonInteractiveChrome ? (
                <div className={cn(topBarPillDisabledClass, styles.textColor)}>
                  {headerData.browseEvent.linkText}
                </div>
              ) : (
                <Link
                  href={headerData.browseEvent.link}
                  className={cn(
                    topBarPillClass,
                    styles.textColor,
                    styles.hoverColor,
                  )}
                >
                  {headerData.browseEvent.linkText}
                </Link>
              ))}
          </div>
          <div className="w-1/3 text-center">
            {useNonInteractiveChrome ? (
              <div className="h-14 flex items-center justify-center cursor-default">
                {logoPath ? (
                  <img
                    src={addCacheBusting(logoPath as string)}
                    width={200}
                    height={116}
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
                      width={200}
                      height={116}
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
            {/* Cart (signed-in) or public location switcher (guest) */}
            {useNonInteractiveChrome ? (
              isAuthenticated ? (
                <div
                  className={cn(
                    "flex items-center gap-1",
                    topBarPillDisabledClass,
                    styles.textColor,
                  )}
                >
                  <ShoppingCart size={16} />
                  <span>Cart</span>
                </div>
              ) : (
                <VendorPublicLocationBookNow
                  disabled
                  pillGlassOnHero={pillGlassOnHero}
                />
              )
            ) : commerceSlotLoading ? (
              <div
                className={cn(
                  "h-9 min-w-[7.5rem] rounded-full border border-transparent bg-white/10 animate-pulse backdrop-blur-md",
                  pillGlassOnHero &&
                    "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)]",
                )}
                aria-busy="true"
                aria-label="Loading"
              />
            ) : showHeaderCart ? (
              <CartButton
                size="sm"
                className={cn(
                  "flex items-center gap-1",
                  topBarPillClass,
                  styles.textColor,
                  styles.hoverColor,
                )}
              />
            ) : (
              <VendorPublicLocationBookNow pillGlassOnHero={pillGlassOnHero} />
            )}

            {hasHeaderDownloads &&
              (useNonInteractiveChrome ? (
                singleHeaderDownload ? (
                  <div
                    className={cn(
                      "flex max-w-[min(100%,15rem)] shrink-0 items-center gap-1",
                      topBarPillDisabledClass,
                      styles.textColor,
                    )}
                    aria-hidden
                  >
                    <FileText size={16} className="shrink-0" />
                    <span className="truncate">
                      {singleHeaderDownload.title}
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex shrink-0 items-center gap-1",
                      topBarPillDisabledClass,
                      styles.textColor,
                    )}
                    aria-hidden
                  >
                    <Download size={16} className="shrink-0" />
                    <span>Downloads</span>
                  </div>
                )
              ) : singleHeaderDownload ? (
                <a
                  href={singleHeaderDownload.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex max-w-[min(100%,15rem)] shrink-0 items-center gap-1",
                    topBarPillClass,
                    styles.textColor,
                    styles.hoverColor,
                  )}
                  onClick={handleLinkClick}
                >
                  <FileText
                    size={16}
                    className={cn("shrink-0", downloadsFileIconClass)}
                  />
                  <span className="truncate">{singleHeaderDownload.title}</span>
                </a>
              ) : multipleHeaderDownloads ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex shrink-0 items-center gap-1",
                        topBarPillClass,
                        styles.textColor,
                        styles.hoverColor,
                      )}
                      aria-label="Downloads"
                    >
                      <Download size={16} className="shrink-0" />
                      <span>Downloads</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className={downloadsDropdownContentClass}
                  >
                    <DropdownMenuLabel className={downloadsDropdownLabelClass}>
                      Downloads
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator
                      className={downloadsDropdownSeparatorClass}
                    />
                    {headerDownloadsList.map((item, idx) => (
                      <DropdownMenuItem
                        key={`${item.title}-${idx}`}
                        asChild
                        className={downloadsDropdownItemClass}
                      >
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex cursor-pointer items-center"
                        >
                          <FileText className={downloadsFileIconClass} />
                          <span className="min-w-0 flex-1">{item.title}</span>
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null)}

            {desktopNavLinkEntries.map(({ icon, link, linkText }, index) => {
              const IconComponent = icon ? iconComponents[icon] : null;
              const isPhoneNumber = icon === "phone";

              const useDisabledNavLink =
                useNonInteractiveChrome && !link.startsWith("tel:");

              if (useDisabledNavLink) {
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-1",
                      topBarPillDisabledClass,
                      "px-2 sm:px-3",
                      styles.textColor,
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
                  </div>
                );
              }

              return (
                <Link
                  key={index}
                  href={link}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center gap-1",
                    topBarPillClass,
                    "px-2 sm:px-3",
                    styles.textColor,
                    styles.hoverColor,
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

            {showGuestAccountMenu &&
              (useNonInteractiveChrome ? (
                <div
                  className={cn(
                    "flex items-center gap-1.5",
                    topBarPillDisabledClass,
                    styles.textColor,
                  )}
                  aria-hidden
                >
                  <UserCircle size={16} className="shrink-0" />
                  <span>Account</span>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1.5",
                        topBarPillClass,
                        styles.textColor,
                        styles.hoverColor,
                      )}
                      aria-label="Account menu"
                      aria-haspopup="menu"
                    >
                      <UserCircle size={16} className="shrink-0" />
                      <span>Account</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className={downloadsDropdownContentClass}
                  >
                    <DropdownMenuItem
                      asChild
                      className={downloadsDropdownItemClass}
                    >
                      <Link
                        href="/auth/login"
                        className="flex cursor-pointer items-center gap-2.5"
                      >
                        <LogIn className={downloadsFileIconClass} />
                        Log in
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className={downloadsDropdownItemClass}
                    >
                      <Link
                        href="/auth/register"
                        className="flex cursor-pointer items-center gap-2.5"
                      >
                        <UserPlus className={downloadsFileIconClass} />
                        Register
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center py-3">
          <button
            type="button"
            onClick={toggleMobileMenu}
            className={cn("p-2", !useNonInteractiveChrome && styles.textColor)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            disabled={useNonInteractiveChrome}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="text-center">
            {useNonInteractiveChrome ? (
              <div className="h-10 flex items-center justify-center cursor-default">
                {logoPath ? (
                  <img
                    src={addCacheBusting(logoPath as string)}
                    width={200}
                    height={116}
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
                      width={200}
                      height={116}
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
            {/* Mobile: cart when signed-in, location switcher when guest */}
            {useNonInteractiveChrome ? (
              isAuthenticated ? (
                <div
                  className={`p-2 ${styles.textColor} opacity-60 transition-colors cursor-not-allowed`}
                >
                  <ShoppingCart className="h-5 w-5" />
                </div>
              ) : (
                <VendorPublicLocationBookNow
                  disabled
                  variant="icon"
                  pillGlassOnHero={pillGlassOnHero}
                  iconTriggerClassName={cn("p-2 rounded-md", styles.textColor)}
                />
              )
            ) : commerceSlotLoading ? (
              <div
                className={cn(
                  "h-9 w-9 shrink-0 rounded-md bg-white/10 animate-pulse",
                  styles.textColor,
                )}
                aria-hidden
              />
            ) : showHeaderCart ? (
              <CartButton
                size="icon"
                className={cn(
                  "p-2 transition-colors",
                  styles.textColor,
                  styles.hoverColor,
                )}
              />
            ) : (
              <VendorPublicLocationBookNow
                variant="icon"
                pillGlassOnHero={pillGlassOnHero}
                iconTriggerClassName={cn(
                  "p-2 transition-colors rounded-md",
                  styles.textColor,
                  styles.hoverColor,
                )}
                align="end"
              />
            )}

            {hasHeaderDownloads &&
              (useNonInteractiveChrome ? (
                singleHeaderDownload ? (
                  <div
                    className={cn(
                      "flex max-w-[10rem] shrink-0 items-center gap-1 opacity-60",
                      topBarPillDisabledClass,
                      styles.textColor,
                      "cursor-not-allowed",
                    )}
                    aria-hidden
                  >
                    <FileText size={16} className="shrink-0" />
                    <span className="truncate text-xs sm:text-sm">
                      {singleHeaderDownload.title}
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex max-w-[9rem] shrink-0 items-center gap-1 opacity-60",
                      topBarPillDisabledClass,
                      styles.textColor,
                      "cursor-not-allowed",
                    )}
                    aria-hidden
                  >
                    <Download size={16} className="shrink-0" />
                    <span className="truncate text-xs sm:text-sm">
                      Downloads
                    </span>
                  </div>
                )
              ) : singleHeaderDownload ? (
                <a
                  href={singleHeaderDownload.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex max-w-[min(100%,11rem)] shrink-0 items-center gap-1 sm:max-w-[15rem]",
                    topBarPillClass,
                    styles.textColor,
                    styles.hoverColor,
                  )}
                  onClick={handleLinkClick}
                >
                  <FileText
                    size={16}
                    className={cn("shrink-0", downloadsFileIconClass)}
                  />
                  <span className="truncate text-xs sm:text-sm">
                    {singleHeaderDownload.title}
                  </span>
                </a>
              ) : multipleHeaderDownloads ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex max-w-[9.5rem] shrink-0 items-center gap-1 sm:max-w-none",
                        topBarPillClass,
                        styles.textColor,
                        styles.hoverColor,
                      )}
                      aria-label="Downloads"
                    >
                      <Download size={16} className="shrink-0" />
                      <span className="truncate text-xs sm:text-sm">
                        Downloads
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className={downloadsDropdownContentClass}
                  >
                    <DropdownMenuLabel className={downloadsDropdownLabelClass}>
                      Downloads
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator
                      className={downloadsDropdownSeparatorClass}
                    />
                    {headerDownloadsList.map((item, idx) => (
                      <DropdownMenuItem
                        key={`${item.title}-${idx}`}
                        asChild
                        className={downloadsDropdownItemClass}
                      >
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex cursor-pointer items-center"
                        >
                          <FileText className={downloadsFileIconClass} />
                          <span className="min-w-0 flex-1">{item.title}</span>
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null)}

            {useNonInteractiveChrome ? (
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
              {!hideBrowseEvents &&
                (useNonInteractiveChrome ? (
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
                ))}

              {useNonInteractiveChrome ? (
                isAuthenticated ? (
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
                  <VendorPublicLocationMobileMenuEntries
                    disabled
                    onNavigate={toggleMobileMenu}
                    mobileNavRowClass={mobileNavRowClass}
                    mobileNavIconWrap={mobileNavIconWrap}
                    hoverColorClass={styles.hoverColor}
                  />
                )
              ) : commerceSlotLoading ? (
                <div
                  className={cn(mobileNavRowClass, "opacity-70")}
                  aria-busy="true"
                >
                  <span className={mobileNavIconWrap} aria-hidden>
                    <MapPin />
                  </span>
                  Loading…
                </div>
              ) : showHeaderCart ? (
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
              ) : (
                <VendorPublicLocationMobileMenuEntries
                  onNavigate={toggleMobileMenu}
                  mobileNavRowClass={mobileNavRowClass}
                  mobileNavIconWrap={mobileNavIconWrap}
                  hoverColorClass={styles.hoverColor}
                />
              )}

              {hasHeaderDownloads && (
                <div className="py-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-header)]/55">
                    Downloads
                  </p>
                  <ul className="flex flex-col gap-2">
                    {(headerDownloads ?? []).map((item, idx) =>
                      useNonInteractiveChrome ? (
                        <li
                          key={`${item.title}-${idx}`}
                          className={cn(
                            mobileNavRowClass,
                            "cursor-not-allowed opacity-60",
                          )}
                        >
                          <span className={mobileNavIconWrap} aria-hidden>
                            <FileText />
                          </span>
                          {item.title}
                        </li>
                      ) : (
                        <li key={`${item.title}-${idx}`}>
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              mobileNavRowClass,
                              styles.hoverColor,
                              "transition-colors",
                            )}
                            onClick={toggleMobileMenu}
                          >
                            <span className={mobileNavIconWrap} aria-hidden>
                              <FileText />
                            </span>
                            {item.title}
                          </a>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {mobileAccountLinks.map(({ link, linkText }, index) => {
                const useDisabledAccountLink =
                  useNonInteractiveChrome && !link.startsWith("tel:");

                const AccountIcon =
                  linkText === "Dashboard"
                    ? LayoutDashboard
                    : linkText === "Log In"
                      ? LogIn
                      : linkText === "Register"
                        ? UserPlus
                        : null;

                if (useDisabledAccountLink) {
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
