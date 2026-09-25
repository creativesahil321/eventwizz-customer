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
import {
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { ServerContext } from "@/lib/server-context";
import { LucideIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { ThemeSchema } from "@/types/theme.types";
import CartButton from "./cart-button";
import {
  VendorPublicLocationBookNow,
  VendorPublicLocationMobileMenuEntries,
} from "./vendor-public-location-book-now";
import { useCartVisibility } from "@/app/(public)/vendor/checkout/_lib/hooks/useCartVisibility";
import { addCacheBusting } from "@/lib/image-utils";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { cn } from "@/lib/utils";
import { getAnchorColor, relativeLuminance } from "@/lib/color-contrast";
import { useMediaPreviewUrl } from "@/hooks/use-media-preview-url";
import {
  useIsPreviewModeFromProvider,
  useIsPreviewMode,
} from "@/contexts/preview-context";
import {
  usePreviewDeviceFramesEnabled,
  usePreviewNarrowLayout,
} from "@/hooks/use-preview-narrow-layout";
import { getNearestScrollContainer } from "@/components/public/event-section-nav";
import type { HeaderDownloadLink } from "@/lib/event-header-downloads";
import { BrandLogoImage } from "@/components/shared/brand-logo-image";
import { resolvePublicPageContact } from "@/lib/resolve-venue-contact";
import {
  previewBrowseIconVisibility,
  previewDesktopActionLabel,
  previewDesktopActionsRowClass,
  previewDesktopHeaderFlex,
  previewDesktopHeaderHidden,
  previewDesktopIconAction,
  previewLogoSizeClass,
} from "@/lib/preview-container-layout";
import { PUBLIC_CHROME_CONTAINER_CLASS } from "@/lib/public-rhythm";
import {
  lockPreviewMenuHostScroll,
  resolvePreviewMobileMenuHost,
} from "@/lib/preview-device";
import { publishEventHeaderOffsetPx } from "@/lib/event-sticky-scroll-offset";
import { PreviewMobileMenuPortal } from "@/components/preview/preview-mobile-menu-portal";
import { PreviewEditRegion } from "@/components/preview/preview-edit-hint";
import { GuestAccountMenu } from "@/components/shared/guest-account-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// CartOrLocationSlot — shows Cart when cart has items, location switcher when empty
// ---------------------------------------------------------------------------
interface CartOrLocationSlotProps {
  pillClassName: string;
  textColorClass: string;
  hoverColorClass: string;
  pillGlassOnHero: boolean;
  variant?: "pill" | "icon";
  iconTriggerClassName?: string;
  align?: "start" | "end";
}

function useCustomerCartVisibility() {
  const { data: session } = useSession();
  const isPreviewMode = useIsPreviewMode();
  return useCartVisibility({
    enabled: session?.user?.account_type === "customer" && !isPreviewMode,
  });
}

function CartOrLocationSlot({
  pillClassName,
  textColorClass,
  hoverColorClass,
  pillGlassOnHero,
  variant = "pill",
  iconTriggerClassName,
  align,
}: CartOrLocationSlotProps) {
  const { hasItems: hasCartItems, isLoading } = useCustomerCartVisibility();

  if (isLoading && !hasCartItems) return null;

  if (hasCartItems) {
    if (variant === "icon") {
      return (
        <CartButton
          size="icon"
          className={
            iconTriggerClassName ??
            `p-2 transition-colors ${textColorClass} ${hoverColorClass}`
          }
        />
      );
    }
    return (
      <CartButton
        size="sm"
        className={`flex items-center gap-1 ${pillClassName} ${textColorClass} ${hoverColorClass}`}
      />
    );
  }

  // Cart is empty — show location switcher instead
  if (variant === "icon") {
    return (
      <VendorPublicLocationBookNow
        variant="icon"
        pillGlassOnHero={pillGlassOnHero}
        iconTriggerClassName={
          iconTriggerClassName ??
          `p-2 transition-colors rounded-md ${textColorClass} ${hoverColorClass}`
        }
        align={align ?? "end"}
      />
    );
  }
  return (
    <VendorPublicLocationBookNow
      pillGlassOnHero={pillGlassOnHero}
      triggerClassName={cn(pillClassName, textColorClass, hoverColorClass)}
    />
  );
}

// ---------------------------------------------------------------------------
// MobileCartOrLocationSlot — drawer row equivalent of CartOrLocationSlot
// ---------------------------------------------------------------------------
interface MobileCartOrLocationSlotProps {
  mobileNavRowClass: string;
  mobileNavIconWrap: string;
  hoverColorClass: string;
  onNavigate: () => void;
}

function MobileCartOrLocationSlot({
  mobileNavRowClass,
  mobileNavIconWrap,
  hoverColorClass,
  onNavigate,
}: MobileCartOrLocationSlotProps) {
  const { hasItems: hasCartItems, isLoading } = useCustomerCartVisibility();

  if (isLoading && !hasCartItems) return null;

  if (hasCartItems) {
    return (
      <div onClick={onNavigate}>
        <CartButton
          size="sm"
          showBadge
          fullWidth
          className={cn(
            mobileNavRowClass,
            hoverColorClass,
            "justify-start rounded-none py-0",
          )}
        />
      </div>
    );
  }

  return (
    <VendorPublicLocationMobileMenuEntries
      onNavigate={onNavigate}
      mobileNavRowClass={mobileNavRowClass}
      mobileNavIconWrap={mobileNavIconWrap}
      hoverColorClass={hoverColorClass}
    />
  );
}

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

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
   * Extra inset for desktop header pills when editor controls float over the
   * hero. Full-page `/preview/event` and `/preview/site` use a reserved bar
   * instead — keep this false there.
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
  /** Prefer this location's phone from theme.locations when set */
  locationSlug?: string | null;
  /**
   * Optional strip above the nav (e.g. event coupon banner).
   * Renders inside the same fixed/sticky chrome so it never covers the header.
   */
  topBanner?: ReactNode;
  /**
   * Use the theme header fill + on-header contrast instead of the transparent
   * overlay used over a dark hero. Required when the hero is not behind the nav
   * (e.g. location search results). Matches LocationSelectionHeader on main search.
   */
  solidBar?: boolean;
  /**
   * Overlay the hero like the live event page (transparent until scroll) instead
   * of occupying layout space. Required in nested preview scroll panels.
   */
  overlayHero?: boolean;
  /**
   * Brand header fill used for light-vs-dark chrome. Preview must pass the same
   * hex as `--color-header` — ServerContext on `/preview/*` is often the
   * platform default (white), which wrongly forces a solid occupying bar.
   */
  headerColor?: string | null;
  /** Onboarding preview: click the brand mark to open the logo upload form. */
  onEditLogo?: () => void;
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
  compactGuestAuth = true,
  scrollContainerRef,
  locationSlug,
  topBanner,
  solidBar = false,
  overlayHero = false,
  headerColor,
  onEditLogo,
}: CommonHeaderProps) {
  const { theme } = useContext(ServerContext);
  // Theme refetch after logo save updates this → busts browser cache for same URL path
  const { mediaVersion: themeMediaVersion } = useTheme();
  const isPreviewFromProvider = useIsPreviewModeFromProvider();
  const isPreviewPath = useIsPreviewMode();
  const deviceFramesEnabled = usePreviewDeviceFramesEnabled();
  /**
   * Preview must match the public customer site: Account menu, not vendor
   * Dashboard. `/preview/site` and `/preview/event` are reviewed against the
   * live guest header.
   */
  const isPreviewChrome =
    variant === "onboarding" ||
    variant === "preview" ||
    isPreviewFromProvider ||
    isPreviewPath;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuHost, setMenuHost] = useState<HTMLElement | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  /** Guest auth CTAs in preview even when the editor session is signed in. */
  const showGuestAuthLinks = isPreviewChrome || !isAuthenticated;
  const headerRootRef = useRef<HTMLElement>(null);
  const overlayBarInnerRef = useRef<HTMLDivElement>(null);
  const [overlayPullPx, setOverlayPullPx] = useState(72);

  // Handle scroll effect (window or embedded preview scroll container)
  useEffect(() => {
    const preferred = scrollContainerRef?.current;
    const scrollRoot =
      preferred && preferred.scrollHeight > preferred.clientHeight + 1
        ? preferred
        : getNearestScrollContainer(headerRootRef.current ?? preferred);

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

  // Prefer explicit prop → location contact → main contactDetails (no fake placeholders)
  const resolvedPhone = resolvePublicPageContact({
    theme: vendorTheme,
    locationSlug,
  }).phone;
  const phoneNumber = contact_number?.trim() || resolvedPhone || "";

  // Define header data using theme
  const headerData = {
    browseEvent: {
      link: "/#",
      linkText: "Browse Events",
    },
    navLinks: [
      ...(phoneNumber
        ? [
            {
              icon: "phone" as IconKey,
              link: `tel:${phoneNumber}`,
              linkText: phoneNumber,
            },
          ]
        : []),
      // Guest auth: live guests when signed out; always in preview (guest look)
      ...(showGuestAuthLinks
        ? [
            {
              link: "/auth/login",
              linkText: "Log In",
            },
            { link: "/auth/register", linkText: "Register" },
          ]
        : []),
      // Dashboard / Continue Onboarding is portal chrome — never show in site preview
      ...(isAuthenticated && session?.user?.account_type && !isPreviewChrome
        ? [
            session.user.account_type === "vendor" && !session.user.isOnboarded
              ? {
                  link: "/on-boarding",
                  linkText: "Continue Onboarding",
                }
              : {
                  link: `/${session.user.account_type}/dashboard`,
                  linkText: "Dashboard",
                },
          ]
        : []),
    ] as NavLink[],
  };

  const accountHomeHref =
    session?.user?.account_type === "vendor" && !session.user.isOnboarded
      ? "/on-boarding"
      : `/${session?.user?.account_type}/dashboard`;

  const desktopNavLinkEntries = headerData.navLinks.filter((l) => {
    if (l.icon === "phone" && hideHeaderPhone) return false;
    if (
      compactGuestAuth &&
      showGuestAuthLinks &&
      (l.linkText === "Log In" || l.linkText === "Register")
    ) {
      return false;
    }
    return true;
  });

  const showGuestAccountMenu = compactGuestAuth && showGuestAuthLinks;

  const resolveMenuHost = () =>
    resolvePreviewMobileMenuHost(
      headerRootRef.current,
      scrollContainerRef?.current,
    );

  const toggleMobileMenu = (event?: { stopPropagation(): void }) => {
    event?.stopPropagation();
    if (!mobileMenuOpen) {
      const host = resolveMenuHost();
      if (host) setMenuHost(host);
    }
    setMobileMenuOpen((open) => !open);
  };

  /** Light header themes (e.g. Clean White `#ffffff`) use on-header text — never glass-over-hero. */
  const headerIsLight = (() => {
    const configuredHeader =
      headerColor?.trim() || vendorTheme?.colors?.header || "#FFFFFF";
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

  /** Dark header over a hero: glass until scroll — live event/location pages. */
  const darkHeroOverlayStyles = (scrolled: boolean) => {
    const overDarkHero = !scrolled;
    return {
      container: scrolled
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
  };

  const useLiveHeroOverlay =
    overlayHero && !solidBar && !topBanner && !headerIsLight;

  // Determine styling based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case "preview":
        if (useLiveHeroOverlay) {
          return darkHeroOverlayStyles(isScrolled);
        }
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
        // Solid bar when there is no dark hero behind the nav (search results,
        // coupon strip) so light logos stay readable — same as main-landing search.
        if (topBanner || solidBar) {
          return solidHeaderBarStyles(true);
        }
        return darkHeroOverlayStyles(isScrolled);
      }
    }
  };

  const styles = getVariantStyles();
  /** Glass pills over imagery: live dark-header + preview overlay + onboarding cover. */
  const pillGlassOnHero =
    ((variant === "default" || overlayHero) &&
      !topBanner &&
      !solidBar &&
      !isScrolled &&
      !headerIsLight) ||
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

  /**
   * Brand mark must never navigate to `/` during site/event preview — that dumps
   * the vendor out of `/preview/*` onto the live home. Cover path-based preview
   * even if PreviewProvider is missing higher in the tree.
   */
  const disableLogoHomeLink =
    useNonInteractiveChrome ||
    isPreviewPath ||
    isPreviewFromProvider ||
    variant !== "default";

  const sessionPending = status === "loading";
  const commerceSlotLoading = !useNonInteractiveChrome && sessionPending;
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
    "flex min-h-12 items-center gap-3 text-[15px] font-medium font-sans text-current";
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

  /**
   * Nested / framed previews scroll inside a panel — sticky, not viewport-fixed.
   * `deviceFramesEnabled` is the safety net when a framed page (e.g. Location
   * on `/preview/onboarding`) forgets to pass `scrollContainerRef`; otherwise
   * the bar goes `fixed` and covers Desktop / Tablet / Mobile.
   */
  const usesEmbeddedScrollPanel =
    Boolean(scrollContainerRef) || deviceFramesEnabled;
  const containMobileMenuInFrame = usesEmbeddedScrollPanel;
  /** Overlay the hero (live look) — do not occupy layout space above the cover. */
  const overlayHeroBar = overlayHero && !solidBar;
  const overlayInScrollPanel = overlayHeroBar && usesEmbeddedScrollPanel;

  const usesStickyHeader =
    !overlayHeroBar &&
    (variant === "preview" || usesEmbeddedScrollPanel);
  const overDarkHeroTransparent =
    !topBanner &&
    !solidBar &&
    !isScrolled &&
    !headerIsLight &&
    (variant === "default" || overlayHero);

  // Avoid dark:bg-background here: it overrides vendor --color-header and causes dark-on-dark
  // chrome when the app shell is in dark mode (e.g. admin event review iframe preview).
  // Do not force a fill while the bar is glass over the hero — preview often has `dark` on <html>.
  const headerDarkModeBg =
    variant === "onboarding"
      ? "dark:bg-background"
      : overDarkHeroTransparent || overlayInScrollPanel
        ? ""
        : "dark:bg-[color:var(--color-header)]";
  /**
   * Container-query header chrome is only for framed onboarding. Full-page
   * `/preview/site` and `/preview/event` must use the same `xl` / `2xl`
   * viewport rules as the live customer site — otherwise preview shows
   * Dashboard/Account labels (and hides the hamburger) at the wrong width.
   */
  const isPreviewNarrow = usePreviewNarrowLayout();
  const usePreviewContainerQueries = deviceFramesEnabled;

  /**
   * Full header from viewport `xl` (1280px) / container `@7xl` (1280px).
   * Below that: hamburger — tablet, mobile, and small desktop / onboarding
   * side panels. (`@lg/preview` is only 512px and caused logo overlap.)
   */
  const desktopHeaderVisibility = isPreviewNarrow
    ? "hidden"
    : usePreviewContainerQueries
      ? previewDesktopHeaderFlex
      : "hidden xl:flex";
  const mobileHeaderVisibility = isPreviewNarrow
    ? "grid"
    : usePreviewContainerQueries
      ? previewDesktopHeaderHidden
      : "xl:hidden";

  // sticky + h-0 is ignored by layout (the bar grows to its content and pushes
  // the hero down). Measure the real chrome, pull the next sibling up, and
  // publish the height so section nav / room bars sit flush (hamburger is
  // shorter than the 4.5rem desktop fallback).
  useLayoutEffect(() => {
    const el = overlayBarInnerRef.current ?? headerRootRef.current;
    if (!el) return;
    const sync = () => {
      const next = Math.round(el.getBoundingClientRect().height);
      if (next <= 0) return;
      if (overlayInScrollPanel) setOverlayPullPx(next);
      publishEventHeaderOffsetPx(el, next);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [overlayInScrollPanel, topBanner, isPreviewNarrow]);

  /** Icon-first until there is room for labels beside a wordmark logo. */
  const desktopActionLabelClass = usePreviewContainerQueries
    ? previewDesktopActionLabel
    : "hidden 2xl:inline";
  /**
   * Phone numbers are the longest header label. In framed preview always icon
   * only. Live: icon until 2xl.
   */
  const desktopPhoneLabelClass = usePreviewContainerQueries
    ? "sr-only"
    : "hidden 2xl:inline";
  const desktopIconActionClass = usePreviewContainerQueries
    ? previewDesktopIconAction
    : "inline-flex h-9 w-9 shrink-0 items-center justify-center gap-0 !px-0 2xl:h-auto 2xl:w-auto 2xl:gap-1.5 2xl:!px-3";
  const desktopPhoneIconActionClass = usePreviewContainerQueries
    ? "inline-flex h-9 w-9 shrink-0 items-center justify-center gap-0 !px-0 box-border"
    : "inline-flex h-9 w-9 shrink-0 items-center justify-center gap-0 !px-0 box-border 2xl:h-auto 2xl:w-auto 2xl:gap-1.5 2xl:!px-3";
  const browseIconVisibilityClass = usePreviewContainerQueries
    ? previewBrowseIconVisibility
    : "h-4 w-4 shrink-0 2xl:hidden";
  const logoSizeClass = usePreviewContainerQueries
    ? previewLogoSizeClass
    : "max-h-11 max-w-[min(100%,9.5rem)] w-auto object-contain xl:max-h-12 xl:max-w-[min(100%,11rem)]";
  const desktopActionsRowClass = usePreviewContainerQueries
    ? previewDesktopActionsRowClass
    : "relative z-0 flex min-w-0 w-1/3 flex-nowrap items-center justify-end gap-1 overflow-visible text-xs xl:gap-1.5 xl:text-sm";

  useEffect(() => {
    if (!isPreviewNarrow) setMobileMenuOpen(false);
  }, [isPreviewNarrow]);

  useLayoutEffect(() => {
    if (!mobileMenuOpen) return;
    const host = resolveMenuHost();
    if (host) setMenuHost(host);
  }, [mobileMenuOpen, scrollContainerRef]);

  useEffect(() => {
    if (!mobileMenuOpen || !menuHost) return;
    return lockPreviewMenuHostScroll(menuHost);
  }, [menuHost, mobileMenuOpen]);
  
    return (
    <section
      ref={headerRootRef}
      className={cn(
        overlayInScrollPanel
          ? cn(
              "relative sticky top-0 w-full overflow-visible",
              mobileMenuOpen ? "z-0" : "z-[80]",
            )
          : usesStickyHeader
            ? cn(
                "sticky top-0 w-full transition-all duration-300",
                mobileMenuOpen ? "z-0" : "z-50",
                containMobileMenuInFrame && "relative overflow-visible",
              )
            : "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        // Banner owns its own fill; keep section transparent so strip colour isn't washed.
        overlayInScrollPanel || topBanner
          ? "bg-transparent shadow-none"
          : styles.container,
        variant !== "default" && styles.textColor,
        headerDarkModeBg,
        className,
      )}
      style={
        overlayInScrollPanel ? { marginBottom: -overlayPullPx } : undefined
      }
    >
      {topBanner ? (
        <div className="pointer-events-auto w-full">{topBanner}</div>
      ) : null}
      <div
        ref={overlayBarInnerRef}
        className={cn(
          "w-full",
          (overlayInScrollPanel || containMobileMenuInFrame) &&
            cn(
              "relative overflow-visible transition-all duration-300",
              mobileMenuOpen ? "z-0" : "z-[80]",
            ),
          overlayInScrollPanel || topBanner ? styles.container : null,
          overlayInScrollPanel &&
            !overDarkHeroTransparent &&
            "dark:bg-[color:var(--color-header)]",
        )}
      >
      <div className={PUBLIC_CHROME_CONTAINER_CLASS}>
        {/* Desktop Header — mirrors live site; container-aware when embedded */}
        <div
          className={cn(
            desktopHeaderVisibility,
            "justify-between items-center py-3",
            variant === "default" && styles.textColor,
          )}
        >
          <div
            className={cn(
              "flex min-w-0 w-1/3 items-center gap-3",
              variant === "preview" &&
                previewBackButtonOffset &&
                "2xl:pl-[11.5rem]",
            )}
          >
            {!hideBrowseEvents &&
              (useNonInteractiveChrome ? (
                <div
                  className={cn(
                    topBarPillDisabledClass,
                    styles.textColor,
                    "inline-flex h-9 items-center gap-1.5",
                    desktopIconActionClass,
                  )}
                  aria-label={headerData.browseEvent.linkText}
                >
                  <Calendar className={browseIconVisibilityClass} />
                  <span className={desktopActionLabelClass}>
                    {headerData.browseEvent.linkText}
                  </span>
                </div>
              ) : (
                <Link
                  href={headerData.browseEvent.link}
                  className={cn(
                    topBarPillClass,
                    styles.textColor,
                    styles.hoverColor,
                    "inline-flex h-9 items-center gap-1.5",
                    desktopIconActionClass,
                  )}
                  aria-label={headerData.browseEvent.linkText}
                >
                  <Calendar className={browseIconVisibilityClass} />
                  <span className={desktopActionLabelClass}>
                    {headerData.browseEvent.linkText}
                  </span>
                </Link>
              ))}
          </div>
          <div
            className={cn(
              "relative z-10 w-1/3 min-w-0 px-1 text-center sm:px-2",
              onEditLogo ? "overflow-visible" : "overflow-hidden",
            )}
          >
            {disableLogoHomeLink ? (
              onEditLogo ? (
                <PreviewEditRegion
                  label="logo"
                  onEdit={onEditLogo}
                  className="inline-flex max-w-full"
                  hoverFrameClassName="rounded-md"
                  badgePositionClassName="-right-1 -top-1"
                >
                  <div className="flex h-14 max-w-full items-center justify-center">
                    {logoPath ? (
                      <BrandLogoImage
                        src={addCacheBusting(
                          logoPath as string,
                          themeMediaVersion,
                        )}
                        width={200}
                        height={116}
                        className={logoSizeClass}
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
                </PreviewEditRegion>
              ) : (
              <div className="flex h-14 max-w-full items-center justify-center cursor-default">
                {logoPath ? (
                  <BrandLogoImage
                    src={addCacheBusting(
                      logoPath as string,
                      themeMediaVersion,
                    )}
                    width={200}
                    height={116}
                    className={logoSizeClass}
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
              )
            ) : (
              <Link
                href="/"
                aria-label="Home"
                className="inline-flex max-w-full"
              >
                <div className="flex h-14 max-w-full items-center justify-center">
                  {logoPath ? (
                    <BrandLogoImage
                      src={addCacheBusting(
                        logoPath as string,
                        themeMediaVersion,
                      )}
                      width={200}
                      height={116}
                      className={logoSizeClass}
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
            className={cn(
              desktopActionsRowClass,
              variant === "preview" &&
                previewBackButtonOffset &&
                "2xl:pr-[12rem]",
            )}
          >
            {/* Cart (signed-in) or public location switcher (guest) */}
            {useNonInteractiveChrome ? (
              <VendorPublicLocationBookNow
                disabled
                pillGlassOnHero={pillGlassOnHero}
                triggerClassName={cn(
                  topBarPillClass,
                  styles.textColor,
                )}
              />
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
            ) : isAuthenticated ? (
              // Authenticated: show Cart when non-empty, location switcher when empty
              <CartOrLocationSlot
                pillClassName={topBarPillClass}
                textColorClass={styles.textColor}
                hoverColorClass={styles.hoverColor}
                pillGlassOnHero={pillGlassOnHero}
                variant="pill"
              />
            ) : (
              <VendorPublicLocationBookNow
                pillGlassOnHero={pillGlassOnHero}
                triggerClassName={cn(
                  topBarPillClass,
                  styles.textColor,
                  styles.hoverColor,
                )}
              />
            )}

            {hasHeaderDownloads &&
              (useNonInteractiveChrome ? (
                singleHeaderDownload ? (
                  <div
                    className={cn(
                      "flex max-w-[min(100%,15rem)] shrink-0 items-center gap-1",
                      topBarPillDisabledClass,
                      styles.textColor,
                      desktopIconActionClass,
                    )}
                    aria-label={singleHeaderDownload.title}
                    aria-hidden
                  >
                    <FileText size={16} className="shrink-0" />
                    <span className={cn("truncate", desktopActionLabelClass)}>
                      {singleHeaderDownload.title}
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex shrink-0 items-center gap-1",
                      topBarPillDisabledClass,
                      styles.textColor,
                      desktopIconActionClass,
                    )}
                    aria-label="Downloads"
                    aria-hidden
                  >
                    <Download size={16} className="shrink-0" />
                    <span className={desktopActionLabelClass}>Downloads</span>
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
                    desktopIconActionClass,
                  )}
                  onClick={handleLinkClick}
                  aria-label={singleHeaderDownload.title}
                  title={singleHeaderDownload.title}
                >
                  <FileText
                    size={16}
                    className={cn("shrink-0", downloadsFileIconClass)}
                  />
                  <span className={cn("truncate", desktopActionLabelClass)}>
                    {singleHeaderDownload.title}
                  </span>
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
                        desktopIconActionClass,
                      )}
                      aria-label="Downloads"
                    >
                      <Download size={16} className="shrink-0" />
                      <span className={desktopActionLabelClass}>Downloads</span>
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
              const isPhoneNumber = icon === "phone";
              const isDashboard =
                linkText === "Dashboard" || linkText === "Continue Onboarding";
              const isAuthLink =
                linkText === "Log In" || linkText === "Register";
              const IconComponent = icon
                ? iconComponents[icon]
                : isDashboard
                  ? LayoutDashboard
                  : linkText === "Log In"
                    ? LogIn
                    : linkText === "Register"
                      ? UserPlus
                      : null;
              const iconOnlyUntilXl =
                isPhoneNumber || isDashboard || isAuthLink;
              const iconActionClass = isPhoneNumber
                ? desktopPhoneIconActionClass
                : iconOnlyUntilXl
                  ? desktopIconActionClass
                  : undefined;
              const labelClass = isPhoneNumber
                ? desktopPhoneLabelClass
                : iconOnlyUntilXl
                  ? desktopActionLabelClass
                  : undefined;

              const useDisabledNavLink = useNonInteractiveChrome;

              if (useDisabledNavLink) {
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-1",
                      topBarPillDisabledClass,
                      iconActionClass,
                      !iconOnlyUntilXl && "px-2 sm:px-3",
                      styles.textColor,
                    )}
                    title={linkText}
                    aria-label={linkText}
                  >
                    {IconComponent && (
                      <IconComponent
                        size={16}
                        className="h-4 w-4 flex-shrink-0"
                      />
                    )}
                    <span className={labelClass}>{linkText}</span>
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
                    iconActionClass,
                    !iconOnlyUntilXl && "px-2 sm:px-3",
                    styles.textColor,
                    styles.hoverColor,
                  )}
                  title={linkText}
                  aria-label={linkText}
                >
                  {IconComponent && (
                    <IconComponent
                      size={16}
                      className="h-4 w-4 flex-shrink-0"
                    />
                  )}
                  <span className={labelClass}>{linkText}</span>
                </Link>
              );
            })}

            {showGuestAccountMenu ? (
              <GuestAccountMenu
                disabled={useNonInteractiveChrome}
                triggerClassName={cn(
                  "flex items-center gap-1.5",
                  useNonInteractiveChrome
                    ? topBarPillDisabledClass
                    : topBarPillClass,
                  styles.textColor,
                  !useNonInteractiveChrome && styles.hoverColor,
                  desktopIconActionClass,
                )}
                labelClassName={desktopActionLabelClass}
                contentClassName={downloadsDropdownContentClass}
                itemClassName={downloadsDropdownItemClass}
                iconClassName={downloadsFileIconClass}
              />
            ) : null}
          </div>
        </div>

        {/* Mobile Header — tablet/phone preview + live below lg */}
        <div
          className={cn(
            mobileHeaderVisibility,
            "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 py-2.5 min-h-[3.25rem]",
          )}
        >
          <button
            type="button"
            data-preview-no-edit=""
            onPointerDown={(event) => event.stopPropagation()}
            onClick={toggleMobileMenu}
            className={cn(
              "relative z-[90] flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
              styles.textColor,
            )}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 justify-center px-1">
            {disableLogoHomeLink ? (
              onEditLogo ? (
                <PreviewEditRegion
                  label="logo"
                  onEdit={onEditLogo}
                  className="inline-flex max-w-full"
                  hoverFrameClassName="rounded-md"
                  badgePositionClassName="-right-1 -top-1"
                >
                  <div className="flex h-9 max-w-full items-center justify-center">
                    {logoPath ? (
                      <BrandLogoImage
                        src={addCacheBusting(
                          logoPath as string,
                          themeMediaVersion,
                        )}
                        width={200}
                        height={116}
                        className="max-h-7 max-w-[min(100%,9.5rem)] w-auto object-contain"
                        alt={vendorTheme?.name || "EventWizz"}
                      />
                    ) : (
                      <div
                        className={`flex items-center gap-2 text-base font-bold truncate ${styles.textColor}`}
                      >
                        <ImageIcon size={18} className="shrink-0" />
                        <span className="truncate">EventWizz</span>
                      </div>
                    )}
                  </div>
                </PreviewEditRegion>
              ) : (
              <div className="flex h-9 max-w-full items-center justify-center cursor-default">
                {logoPath ? (
                  <BrandLogoImage
                    src={addCacheBusting(
                      logoPath as string,
                      themeMediaVersion,
                    )}
                    width={200}
                    height={116}
                    className="max-h-7 max-w-[min(100%,9.5rem)] w-auto object-contain"
                    alt={vendorTheme?.name || "EventWizz"}
                  />
                ) : (
                  <div
                    className={`flex items-center gap-2 text-base font-bold truncate ${styles.textColor}`}
                  >
                    <ImageIcon size={18} className="shrink-0" />
                    <span className="truncate">EventWizz</span>
                  </div>
                )}
              </div>
              )
            ) : (
              <Link
                href="/"
                aria-label="Home"
                className="flex max-w-full min-w-0"
              >
                <div className="flex h-9 max-w-full items-center justify-center">
                  {logoPath ? (
                    <BrandLogoImage
                      src={addCacheBusting(
                        logoPath as string,
                        themeMediaVersion,
                      )}
                      width={200}
                      height={116}
                      className="max-h-7 max-w-[min(100%,9.5rem)] w-auto object-contain"
                      alt={vendorTheme?.name || "EventWizz"}
                    />
                  ) : (
                    <div
                      className={`flex items-center gap-2 text-base font-bold truncate ${styles.textColor}`}
                    >
                      <ImageIcon size={18} className="shrink-0" />
                      <span className="truncate">EventWizz</span>
                    </div>
                  )}
                </div>
              </Link>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Mobile: cart when signed-in, location switcher when guest */}
            {useNonInteractiveChrome ? (
              <>
                <VendorPublicLocationBookNow
                  disabled
                  variant="icon"
                  pillGlassOnHero={pillGlassOnHero}
                  iconTriggerClassName={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md",
                    styles.textColor,
                  )}
                />
                {isAuthenticated && !isPreviewChrome ? (
                  <div
                    className={`flex h-9 w-9 items-center justify-center ${styles.textColor} opacity-60 transition-colors cursor-not-allowed`}
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                ) : null}
              </>
            ) : commerceSlotLoading ? (
              <div
                className={cn(
                  "h-9 w-9 shrink-0 rounded-md bg-white/10 animate-pulse",
                  styles.textColor,
                )}
                aria-hidden
              />
            ) : isAuthenticated ? (
              // Authenticated: show Cart icon when non-empty, location icon when empty
              <CartOrLocationSlot
                pillClassName={topBarPillClass}
                textColorClass={styles.textColor}
                hoverColorClass={styles.hoverColor}
                pillGlassOnHero={pillGlassOnHero}
                variant="icon"
                iconTriggerClassName={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  styles.textColor,
                  styles.hoverColor,
                )}
                align="end"
              />
            ) : (
              <VendorPublicLocationBookNow
                variant="icon"
                pillGlassOnHero={pillGlassOnHero}
                iconTriggerClassName={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  styles.textColor,
                  styles.hoverColor,
                )}
                align="end"
              />
            )}

            {useNonInteractiveChrome ? (
              <div
                className={`flex h-9 w-9 items-center justify-center ${styles.textColor} opacity-60 cursor-not-allowed`}
                aria-label="Profile"
              >
                <UserCircle className="h-5 w-5" />
              </div>
            ) : isAuthenticated ? (
              <Link
                href={accountHomeHref}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  styles.textColor,
                  styles.hoverColor,
                )}
                aria-label={
                  session?.user?.account_type === "vendor" &&
                  !session.user.isOnboarded
                    ? "Continue Onboarding"
                    : "Dashboard"
                }
              >
                <UserCircle className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
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

        {mobileMenuOpen && menuHost ? (
          <PreviewMobileMenuPortal
            host={menuHost}
            themeFrom={headerRootRef.current}
            onDismiss={() => toggleMobileMenu()}
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
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-8 font-sans"
            aria-label="Main navigation"
          >
            <div className="flex flex-col divide-y divide-current/15">
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
                <>
                  <VendorPublicLocationMobileMenuEntries
                    disabled
                    onNavigate={toggleMobileMenu}
                    mobileNavRowClass={mobileNavRowClass}
                    mobileNavIconWrap={mobileNavIconWrap}
                    hoverColorClass={styles.hoverColor}
                  />
                  {isAuthenticated && !isPreviewChrome ? (
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
                  ) : null}
                </>
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
              ) : isAuthenticated ? (
                // Authenticated: Cart row when non-empty, location entries when empty
                <MobileCartOrLocationSlot
                  mobileNavRowClass={mobileNavRowClass}
                  mobileNavIconWrap={mobileNavIconWrap}
                  hoverColorClass={styles.hoverColor}
                  onNavigate={toggleMobileMenu}
                />
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
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-current/55">
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
                const useDisabledAccountLink = useNonInteractiveChrome;

                const AccountIcon =
                  linkText === "Dashboard" || linkText === "Continue Onboarding"
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
              <div className="mt-6 border-t border-current/20 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-current/55">
                  Contact
                </p>
                {useNonInteractiveChrome ? (
                  <div
                    className={cn(
                      mobileNavRowClass,
                      "min-h-0 cursor-not-allowed py-1 opacity-60",
                    )}
                    aria-label={mobileContactLink.linkText}
                  >
                    <span className={mobileNavIconWrap} aria-hidden>
                      <Phone />
                    </span>
                    <span className="min-w-0 break-words">
                      {mobileContactLink.linkText}
                    </span>
                  </div>
                ) : (
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
                )}
              </div>
            )}
          </nav>
          </PreviewMobileMenuPortal>
        ) : null}
      </div>
      </div>
    </section>
  );
}
