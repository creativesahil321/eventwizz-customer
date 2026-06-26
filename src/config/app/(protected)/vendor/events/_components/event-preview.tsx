"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import type { DownloadItem } from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/brochure-section";
import AboutEventSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/About-event-sec";
import DatesSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Dates-section";
import EventGallery from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Event-gallery";
import PackageSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/package-sec";
import Timeline from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Time-line";
import CommonHeader from "@/components/shared/common-header";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import { themeDetectionFromVendorEventData } from "@/lib/theme-detection-source";
import { EventDetailData } from "@/services/vendor/events/type";
import {
  LazyBrochureSection,
  LazyDrinkSection,
  LazyFaqSection,
  LazyMenuSection,
} from "@/components/public/event-detail-lazy-sections";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import {
  getAnchorColor,
  pickReadableForeground,
  relativeLuminance,
} from "@/lib/color-contrast";
import { CartConflictProvider } from "@/app/(public)/vendor/checkout/_components/cart-conflict-provider";
import { ThemeAnimationManager } from "@/components/theme-animations/theme-animation-manager";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { EventHeroBand } from "@/components/public/event-hero-band";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import { headerLinksFromDownloadItems } from "@/lib/event-header-downloads";
import { EVENT_BOOKING_SECTION_CLASSNAME } from "@/lib/event-booking-section-layout";
import { ONBOARDING_ROOM_SELECTOR_SCROLL_THRESHOLD_PX } from "@/app/(on-boarding)/on-boarding/_components/form-preview/preview-layout-constants";
import {
  isVendorEventRoomPreviewMode,
  resolveVendorPreviewActiveSlices,
} from "../_lib/resolve-vendor-preview-room-slices";
import { VendorPreviewRoomSelector } from "./vendor-preview-room-selector";
import { useIsPreviewModeFromProvider } from "@/contexts/preview-context";

import "@/app/(public)/[locationSlug]/events/[eventSlug]/event-detail.css";

interface EventPreviewProps {
  data: EventDetailData;
  siteEssentials?: SiteEssentialsFormValues | null;
  /**
   * True when preview sits inside admin review or vendor form tabs (no floating "Back to Editor").
   * Disables the header left inset and adds horizontal padding so the bar aligns like the live site.
   */
  embedInShell?: boolean;
}

function mapGalleryForPreview(
  gallery: Array<string | File | { id: number; url: string }> | undefined,
) {
  if (!gallery || gallery.length === 0) return undefined;

  return gallery.map((image) => {
    if (typeof image === "string") {
      return {
        path: image,
        relativePath: image,
        preview: image,
      };
    }
    if (image instanceof File) {
      return {
        path: image.name,
        relativePath: image.name,
        preview: URL.createObjectURL(image),
      };
    }
    if (typeof image === "object" && image !== null && "url" in image) {
      const galleryItem = image as { id: number; url: string };
      return {
        path: galleryItem.url,
        relativePath: galleryItem.url,
        preview: galleryItem.url,
      };
    }
    const o = image as { path?: string; preview?: string };
    const src = o.preview || o.path || "";
    return { path: src, relativePath: src, preview: src };
  });
}

/** Mirrors `EventDetailClient` section order, hero, conditionals, and brochure/footer so vendor + admin preview match the live event page. */
export function EventPreview({
  data,
  siteEssentials,
  embedInShell = false,
}: EventPreviewProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [roomSelectorScrollVisible, setRoomSelectorScrollVisible] =
    useState(false);

  const isPostOnboardingPreview = useIsPreviewModeFromProvider();
  const roomPreviewMode = isVendorEventRoomPreviewMode(data);

  useEffect(() => {
    setCurrentRoomIndex(0);
  }, [data.stepOne?.event_id, roomPreviewMode]);

  const slices = useMemo(
    () => resolveVendorPreviewActiveSlices(data, currentRoomIndex),
    [data, currentRoomIndex],
  );

  const showRoomSelector = roomPreviewMode && slices.rooms.length >= 2;

  /** Post-onboarding review shows rooms immediately; in-form preview fades in after scroll. */
  const roomSelectorVisible =
    showRoomSelector &&
    (isPostOnboardingPreview || roomSelectorScrollVisible);

  useEffect(() => {
    if (!showRoomSelector) {
      setRoomSelectorScrollVisible(false);
      return;
    }

    const threshold = ONBOARDING_ROOM_SELECTOR_SCROLL_THRESHOLD_PX;

    const isScrollableContainer = (el: HTMLElement) =>
      el.scrollHeight > el.clientHeight + 1;

    const getScrollTop = () => {
      const container = previewContainerRef.current;
      if (container && isScrollableContainer(container)) {
        return container.scrollTop;
      }
      return typeof window !== "undefined" ? window.scrollY : 0;
    };

    const getViewportHeight = () => {
      const container = previewContainerRef.current;
      if (container && isScrollableContainer(container)) {
        return container.clientHeight;
      }
      return typeof window !== "undefined" ? window.innerHeight : 0;
    };

    const handleScroll = () => {
      const scrollTop = getScrollTop();
      const height = getViewportHeight();
      setRoomSelectorScrollVisible(
        scrollTop >= Math.max(threshold, height * 0.22),
      );
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    const container = previewContainerRef.current;
    container?.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      container?.removeEventListener("scroll", handleScroll);
    };
  }, [showRoomSelector]);

  const contactNumber =
    data.contact_number || data.stepEight?.contact_number || "";

  const themeColors = siteEssentials?.colors || {
    primary: "#0F172A",
    secondary: "#64748B",
    header: "#FFFFFF",
    footer: "#0F172A",
    background: "#F8FAFC",
    text: "#0F172A",
    textDimmed: "#64748B",
    surface: "#FFFFFF",
  };

  const primaryHex = themeColors.primary || "#0F172A";
  const secondaryHex = themeColors.secondary || "#64748B";

  /** Configured header color from theme / defaults */
  const configuredHeaderHex = themeColors.header || "#FFFFFF";
  /**
   * Admin + in-app embed often have no Site Essentials → default white header.
   * Many venue logos are white/light for use on photos; on white they disappear.
   * Use the brand primary for the bar when the header would be near-white (same idea as a solid bar on live sites).
   */
  const headerHex = (() => {
    if (!embedInShell) return configuredHeaderHex;
    try {
      const anchor = getAnchorColor(configuredHeaderHex);
      if (relativeLuminance(anchor) >= 0.88) {
        return getAnchorColor(primaryHex);
      }
    } catch {
      /* keep configured */
    }
    return configuredHeaderHex;
  })();
  const footerHex = themeColors.footer || "#0F172A";
  const backgroundHex = themeColors.background || "#F8FAFC";
  const surfaceHex = themeColors.surface || "#FFFFFF";

  const themeTypography = siteEssentials?.typography || {
    fontFamily: {
      heading: "'Inter', sans-serif",
      body: "'Inter', sans-serif",
    },
  };

  const headingFont =
    themeTypography.fontFamily?.heading || "'Inter', sans-serif";
  const bodyFont = themeTypography.fontFamily?.body || "'Inter', sans-serif";

  const previewStyles = {
    "--color-primary": primaryHex,
    "--color-secondary": secondaryHex,
    "--color-header": headerHex,
    "--color-footer": footerHex,
    "--color-background": backgroundHex,
    "--color-text": themeColors.text || "#0F172A",
    "--color-text-dimmed": themeColors.textDimmed || "#64748B",
    "--color-surface": surfaceHex,
    "--color-primary-foreground": pickReadableForeground(primaryHex),
    "--color-secondary-foreground": pickReadableForeground(secondaryHex),
    "--color-on-header": pickReadableForeground(headerHex),
    "--color-on-footer": pickReadableForeground(footerHex),
    "--color-on-surface": pickReadableForeground(surfaceHex),
    "--color-on-background": pickReadableForeground(backgroundHex),
    "--color-footer-text": pickReadableForeground(footerHex),
    "--color-footer-muted": "rgba(248, 250, 252, 0.35)",
    "--font-heading": headingFont,
    "--font-body": bodyFont,
  } as React.CSSProperties;

  const s1 = data.stepOne;
  const s2 = data.stepTwo;
  const s7 = data.stepSeven;
  const s8 = data.stepEight;

  const activePackage = slices.roomMode ? slices.package : s2;
  const activeMenu = slices.roomMode ? slices.menu : data.stepFour;
  const activeDrinks = slices.roomMode ? slices.drinks : data.stepFive;
  const activeBrochure = slices.roomMode ? slices.brochure : data.stepSix;

  /** Same rows as `BrochureSection` so header (single link vs menu) stays in sync with the page. */
  const eventBrochureDownloads = useMemo(
    () =>
      [
        ...(activeBrochure?.brochure_pdf
          ? [{ title: "Event brochure", download_link: [activeBrochure.brochure_pdf] }]
          : []),
        ...(activeBrochure?.brochure_pdf_2
          ? [{ title: "Event Flayer", download_link: [activeBrochure.brochure_pdf_2] }]
          : []),
      ] as DownloadItem[],
    [activeBrochure?.brochure_pdf, activeBrochure?.brochure_pdf_2],
  );

  const headerDownloads = useMemo(
    () => headerLinksFromDownloadItems(eventBrochureDownloads),
    [eventBrochureDownloads],
  );

  const eventName = s1?.event_name || s1?.event_banner_heading || "Event";
  const eventSlug =
    data.slug?.trim() ||
    (s1?.event_id != null ? `event-${s1.event_id}` : "preview");

  const headingEmphasisForHero = siteEssentials
    ? normalizeHeadingEmphasis(siteEssentials.typography?.headingEmphasis)
    : undefined;

  const heroTitle =
    s1?.event_banner_heading?.trim() || s1?.event_name?.trim() || "";

  const heroAccentHint =
    typeof s1?.event_banner_heading_accent === "string" &&
    s1.event_banner_heading_accent.trim().length > 0
      ? s1.event_banner_heading_accent.trim()
      : null;

  const datesForSection = useMemo(() => {
    const dates = slices.roomMode
      ? slices.dates
      : data.stepThree?.dates;
    return (
      dates?.map((date) => {
        const ticketPrices = (date.tickets ?? [])
          .map((t) => Number(t.price))
          .filter((n) => !Number.isNaN(n) && n >= 0);
        const tablePrices = (date.tables ?? [])
          .map((t) => Number(t.price))
          .filter((n) => !Number.isNaN(n) && n >= 0);
        const allPrices = [...ticketPrices, ...tablePrices];
        const price = allPrices.length > 0 ? Math.min(...allPrices) : 0;
        return {
          event_date: date.event_date,
          price,
        };
      }) ?? []
    );
  }, [slices.dates, slices.roomMode, data.stepThree?.dates]);

  const menus = activeMenu?.menus ?? [];
  const showMenu = menus.length > 0;

  const drinkPackages = (activeDrinks?.packages ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    price:
      typeof p.price === "number" ? p.price : parseFloat(String(p.price)) || 0,
    available_quantity: p.available_quantity,
  }));
  const showDrinks = drinkPackages.length > 0;

  const faqs = s7?.faqs ?? [];
  const showFaqs = faqs.length > 0;

  const firstPkg = activeDrinks?.packages?.[0];
  const brochureFallbackAmount =
    firstPkg != null
      ? typeof firstPkg.price === "number"
        ? firstPkg.price
        : parseFloat(String(firstPkg.price || 0)) || 45
      : 45;
  const brochureAmount = brochureFallbackAmount;
  const brochurePriceDescription = `${formatMoney(brochureAmount)} PP exc VAT`;

  const bannerImage = s1?.event_banner_image || "";
  const bannerVideo = s1?.event_banner_video || null;

  const galleryImages = useMemo(() => {
    const gallery = slices.roomMode
      ? activePackage?.gallery
      : s2?.gallery;
    return mapGalleryForPreview(gallery);
  }, [slices.roomMode, activePackage?.gallery, s2?.gallery]);

  const timelineRows = useMemo(() => {
    const rows = activePackage?.event_schedular ?? [];
    return rows
      .map((item) => ({
        title: String(item.title ?? "").trim(),
        time: String(item.time ?? "").trim(),
      }))
      .filter((item) => item.title || item.time);
  }, [activePackage?.event_schedular]);

  const showTimeline =
    String(activePackage?.event_schedular_title ?? "").trim().length > 0 ||
    timelineRows.length > 0;

  const brochureAddress =
    slices.eventAddress ||
    activeBrochure?.event_address ||
    data.stepSix?.event_address ||
    "";

  return (
    <CartConflictProvider>
      <div
        ref={previewContainerRef}
        className={`event-detail-page ${
          themeColors.background?.includes("linear-gradient")
            ? "bg-none"
            : "bg-[color:var(--color-background)]"
        } text-[color:var(--color-text)] font-body`}
        style={
          themeColors.background?.includes("linear-gradient")
            ? {
                ...previewStyles,
                background: themeColors.background,
                fontFamily: "var(--font-body)",
              }
            : { ...previewStyles, fontFamily: "var(--font-body)" }
        }
      >
        {/* Theme FX: vendor payload is step-based — map stepOne copy for keyword detection like the live page */}
        <ThemeAnimationManager
          themeDetectionSource={themeDetectionFromVendorEventData(data)}
          enabled={true}
          intensity="medium"
        />
        <SiteEssentialsGoogleFontsLoader
          linkId="site-essentials-google-fonts-event-preview"
          headingStack={headingFont}
          bodyStack={bodyFont}
          customStylesheetUrls={
            siteEssentials?.typography?.customFontStylesheetUrls
          }
        />

        <CommonHeader
          contact_number={contactNumber}
          logo={siteEssentials?.logo || data.logo || null}
          variant="preview"
          previewBackButtonOffset={!embedInShell}
          className={embedInShell ? "px-3 sm:px-4 md:px-6" : ""}
          headerDownloads={headerDownloads}
          scrollContainerRef={previewContainerRef}
        />

        {showRoomSelector ? (
          <VendorPreviewRoomSelector
            rooms={slices.rooms}
            currentRoomIndex={currentRoomIndex}
            onRoomChange={setCurrentRoomIndex}
            visible={roomSelectorVisible}
            layout="sticky"
          />
        ) : null}

        <div
          className={
            roomSelectorVisible ? "-mt-12 transition-all duration-300" : ""
          }
        >
        <EventHeroBand
          title={heroTitle || eventName}
          subHeading={s1?.event_banner_sub_heading || null}
          accentHint={heroAccentHint}
          headingEmphasis={headingEmphasisForHero}
          bannerHeadingAlign={siteEssentials?.banner_heading_align ?? null}
          bannerHeadingValign={siteEssentials?.banner_heading_valign ?? null}
          bannerImage={bannerImage || null}
          bannerVideo={bannerVideo}
          cacheBustImage
          imageAlt={eventName}
        />
        </div>

        <AboutEventSec
          about_event_heading={s1?.about_event_heading || ""}
          about_event_sub_heading={s1?.about_event_sub_heading || ""}
          about_event_description={s1?.about_event_description || ""}
          headingEmphasis={headingEmphasisForHero}
          aboutHeadingAccentHint={heroAccentHint}
        />

        {showTimeline ? (
          <Timeline
            eventSchedular={timelineRows}
            eventSchedularTitle={activePackage?.event_schedular_title || ""}
            eventSchedularCopy={activePackage?.event_schedule_subtitle || ""}
            eventSchedularBackgroundImage={
              typeof activePackage?.event_schedular_background_image ===
              "string"
                ? activePackage.event_schedular_background_image
                : undefined
            }
          />
        ) : null}

        <PackageSec
          heading={activePackage?.package_title || ""}
          subHeading={activePackage?.package_description || ""}
          image={activePackage?.package_image || null}
          packageDetails={(activePackage?.package_details ?? []).map(
            (detail) => ({
              title: String(detail.title ?? ""),
            }),
          )}
          headingEmphasis={headingEmphasisForHero}
        />

        <div id="booking" className={EVENT_BOOKING_SECTION_CLASSNAME}>
          <DatesSection
            dates={datesForSection}
            eventSlug={eventSlug}
            eventName={eventName}
            eventImage={
              s1?.event_banner_image || s1?.event_banner_video || undefined
            }
          />
        </div>

        <EventGallery gallery={galleryImages} />

        {showMenu && (
          <LazyMenuSection
            menu_title={activeMenu?.menu_title || ""}
            menu_description={activeMenu?.menu_description || ""}
            menus={menus}
            catering_option={1}
            menu_background_image={
              typeof activeMenu?.menu_background_image === "string"
                ? activeMenu.menu_background_image
                : (activeMenu?.menu_background_image ?? undefined)
            }
          />
        )}

        {showDrinks && (
          <LazyDrinkSection
            title={activeDrinks?.drink_title || ""}
            description={activeDrinks?.drink_description || ""}
            packages={drinkPackages}
            eventSlug={eventSlug}
          />
        )}

        <LazyBrochureSection
          showMapImmediately
          location={{
            title: "EVENT LOCATION",
            description:
              brochureAddress || "Event location will be displayed here",
            icon: "MapPin",
            latitude: data.lat ?? s8?.latitude ?? null,
            longitude: data.long ?? s8?.longitude ?? null,
          }}
          downloads={eventBrochureDownloads}
          price={{
            title: "PRICES FROM",
            description: brochurePriceDescription,
            link: "#booking",
            price_title: "Book Now",
          }}
        />

        {showFaqs && <LazyFaqSection faqs={faqs} />}

        <FooterSection logo={siteEssentials?.logo || data.logo || undefined} />
      </div>
    </CartConflictProvider>
  );
}
