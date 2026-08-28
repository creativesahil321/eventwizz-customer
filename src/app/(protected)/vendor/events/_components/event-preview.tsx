"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { DownloadItem } from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/brochure-section";
import AboutEventSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/About-event-sec";
import DatesSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Dates-section";
import EventGallery from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Event-gallery";
import PackageSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/package-sec";
import Timeline from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Time-line";
import CommonHeader from "@/components/shared/common-header";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import { firstFooterBrandDescription } from "@/lib/footer-brand-description";
import { EventDetailData } from "@/services/vendor/events/type";
import {
  LazyBrochureSection,
  LazyDrinkSection,
  LazyFaqSection,
  LazyMenuSection,
} from "@/components/public/event-detail-lazy-sections";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import { buildSiteEssentialsContactTheme } from "@/app/(protected)/_shared/sites-essentials/_lib/preview-contact";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import {
  getAnchorColor,
  pickHeroOverlayColor,
  pickReadableForeground,
  relativeLuminance,
} from "@/lib/color-contrast";
import { CartConflictProvider } from "@/app/(public)/vendor/checkout/_components/cart-conflict-provider";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { EventHeroBand } from "@/components/public/event-hero-band";
import { EventRoomChooser } from "@/components/public/event-room-chooser";
import { RoomContentTransition } from "@/components/public/room-content-transition";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import { headerLinksFromDownloadItems } from "@/lib/event-header-downloads";
import { EVENT_BOOKING_SECTION_CLASSNAME } from "@/lib/event-booking-section-layout";
import { scrollToElementIfNeeded } from "@/lib/scroll-to-element-if-needed";
import {
  firstBookableVendorPreviewRoomIndex,
  isVendorEventRoomPreviewMode,
  listVendorPreviewRoomSummaries,
  resolveVendorPreviewActiveSlices,
} from "../_lib/resolve-vendor-preview-room-slices";
import { VendorPreviewRoomSelector } from "./vendor-preview-room-selector";
import {
  EventSectionNav,
  EVENT_SECTION_IDS,
  EVENT_SECTION_NAV_HEIGHT,
  EVENT_SECTION_NAV_HEIGHT_PX,
  buildEventSectionNavItems,
  getNearestScrollContainer,
} from "@/components/public/event-section-nav";
import { ONBOARDING_PREVIEW_HEADER_OFFSET } from "@/app/(on-boarding)/on-boarding/_components/form-preview/preview-layout-constants";
import { slugToShortLabel } from "@/lib/slug-short-label";
import { lowestBookableFromPrice } from "@/lib/event-room-chooser-item";
import {
  formatEventHeroDateRange,
  formatEventHeroTimeRange,
  readEventCategoryLabel,
} from "@/lib/event-hero-meta";

import "@/app/(public)/[locationSlug]/events/[eventSlug]/event-detail.css";

const HEADER_OFFSET_PX = 72;

interface EventPreviewProps {
  data: EventDetailData;
  siteEssentials?: SiteEssentialsFormValues | null;
  /**
   * Location slug for footer (venue + head office), same as live
   * `FooterSection locationSlug={…}` on the public event page.
   */
  locationSlug?: string | null;
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
  locationSlug,
  embedInShell = false,
}: EventPreviewProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const chooserRef = useRef<HTMLDivElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);
  const roomPreviewMode = isVendorEventRoomPreviewMode(data);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(() =>
    firstBookableVendorPreviewRoomIndex(data),
  );
  const [roomSelectorScrollVisible, setRoomSelectorScrollVisible] =
    useState(false);

  useEffect(() => {
    setCurrentRoomIndex(firstBookableVendorPreviewRoomIndex(data));
    // Reset when event identity / room-mode flips — not every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- data read intentionally once per id/mode
  }, [data.stepOne?.event_id, roomPreviewMode]);

  const slices = useMemo(
    () => resolveVendorPreviewActiveSlices(data, currentRoomIndex),
    [data, currentRoomIndex],
  );

  const roomSummaries = useMemo(
    () => (roomPreviewMode ? listVendorPreviewRoomSummaries(data) : []),
    [roomPreviewMode, data],
  );

  useEffect(() => {
    if (!roomPreviewMode) return;
    const bookableIndex = firstBookableVendorPreviewRoomIndex(data);
    if (
      roomSummaries[currentRoomIndex]?.disabled &&
      bookableIndex !== currentRoomIndex
    ) {
      setCurrentRoomIndex(bookableIndex);
    }
  }, [roomPreviewMode, roomSummaries, currentRoomIndex, data]);

  const showRoomSelector = roomPreviewMode && roomSummaries.length >= 2;
  const roomContentKey =
    slices.activeRoom?.room_id ?? `room-${currentRoomIndex}`;
  const roomSelectorVisible = showRoomSelector && roomSelectorScrollVisible;

  const handleRoomChange = useCallback(
    (index: number) => {
      const target = roomSummaries[index];
      if (target?.disabled) return;
      setCurrentRoomIndex(index);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const local = previewContainerRef.current;
          scrollToElementIfNeeded(bookingRef.current, {
            headerOffsetPx: HEADER_OFFSET_PX + EVENT_SECTION_NAV_HEIGHT_PX,
            scrollContainer:
              local && local.scrollHeight > local.clientHeight + 1
                ? local
                : getNearestScrollContainer(local),
          });
        });
      });
    },
    [roomSummaries],
  );

  useEffect(() => {
    if (!showRoomSelector) {
      setRoomSelectorScrollVisible(false);
      return;
    }

    const handleScroll = () => {
      const chooser = chooserRef.current;
      const local = previewContainerRef.current;
      const container =
        local && local.scrollHeight > local.clientHeight + 1
          ? local
          : getNearestScrollContainer(local);
      const useContainer = !!container;

      if (!chooser) {
        const scrollTop = useContainer ? container!.scrollTop : window.scrollY;
        const height = useContainer
          ? container!.clientHeight
          : window.innerHeight;
        setRoomSelectorScrollVisible(scrollTop > height * 0.6);
        return;
      }

      if (useContainer && container) {
        const chooserRect = chooser.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const bottomRelative = chooserRect.bottom - containerRect.top;
        setRoomSelectorScrollVisible(bottomRelative <= HEADER_OFFSET_PX + 8);
        return;
      }

      const { bottom } = chooser.getBoundingClientRect();
      setRoomSelectorScrollVisible(bottom <= HEADER_OFFSET_PX + 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    const local = previewContainerRef.current;
    const scrollRoot =
      local && local.scrollHeight > local.clientHeight + 1
        ? local
        : getNearestScrollContainer(local);
    scrollRoot?.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      scrollRoot?.removeEventListener("scroll", handleScroll);
    };
  }, [showRoomSelector]);

  const contactNumber =
    data.contact_number || data.stepEight?.contact_number || "";

  /** Same source as live event page: theme locations + contactDetails via site essentials. */
  const footerLocationSlug = useMemo(() => {
    const fromProp = locationSlug?.trim();
    if (fromProp) return fromProp;

    const locationId =
      data.stepOne?.vendor_location_id ?? data.vendor_location_id;
    const locations = siteEssentials?.locations ?? [];
    if (locationId != null && locations.length > 0) {
      const idNum = Number(locationId);
      const matched = locations.find(
        (loc) => loc.id != null && Number(loc.id) === idNum,
      );
      if (matched?.slug?.trim()) return matched.slug.trim();
    }

    // Do not fall back to siteEssentials.slug — that is often the main/home
    // slug and collapses the footer to a single head-office block.
    return null;
  }, [
    locationSlug,
    data.stepOne?.vendor_location_id,
    data.vendor_location_id,
    siteEssentials?.locations,
  ]);
  const footerContactTheme = useMemo(
    () => buildSiteEssentialsContactTheme(siteEssentials),
    [siteEssentials],
  );

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
   * Admin embeds often have no Site Essentials → default white header, which
   * hides light logos. Only then swap near-white → primary.
   * Never overwrite an explicit brand header (e.g. cream `#F7F3E3`) — that
   * broke `/preview/event` parity with the live event page.
   */
  const hasExplicitHeaderColor = Boolean(
    siteEssentials?.colors?.header?.trim(),
  );
  const headerHex = (() => {
    if (!embedInShell || hasExplicitHeaderColor) return configuredHeaderHex;
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
    "--color-hero-overlay": pickHeroOverlayColor(headerHex, footerHex),
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
  // Always from slices — non-room + room both map step5=brochure, step6=drinks.
  const activeDrinks = slices.drinks;
  const activeBrochure = slices.brochure;

  /** Same rows as the header downloads control (brochure / flyer PDFs). */
  const eventBrochureDownloads = useMemo(
    () =>
      [
        ...(activeBrochure?.brochure_pdf
          ? [
              {
                title: "Event brochure",
                download_link: [activeBrochure.brochure_pdf],
              },
            ]
          : []),
        ...(activeBrochure?.brochure_pdf_2
          ? [
              {
                title: "Event Flayer",
                download_link: [activeBrochure.brochure_pdf_2],
              },
            ]
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
    const dates = slices.roomMode ? slices.dates : data.stepThree?.dates;
    return (
      dates?.map((date) => {
        const ticketPrices =
          date.booking_type !== "tables"
            ? (date.tickets ?? [])
                .map((t) => Number(t.price))
                .filter((n) => !Number.isNaN(n) && n >= 0)
            : [];
        const tablePrices =
          date.booking_type !== "tickets"
            ? (date.tables ?? [])
                .map((t) => Number(t.price))
                .filter((n) => !Number.isNaN(n) && n >= 0)
            : [];
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

  const brochureAmount = lowestBookableFromPrice({
    datePrices: datesForSection.map((date) => date.price),
    packagePrices: drinkPackages.map((pkg) => pkg.price),
  });
  const brochurePriceDescription =
    brochureAmount != null
      ? `${formatMoney(brochureAmount)} per person`
      : "See dates below";

  const bannerImage = s1?.event_banner_image || "";
  const bannerVideo = s1?.event_banner_video || null;

  const galleryImages = useMemo(() => {
    const gallery = slices.roomMode ? activePackage?.gallery : s2?.gallery;
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

  const heroCityLabel = (() => {
    const slug = footerLocationSlug?.trim();
    if (!slug) return null;
    const fromLocations = siteEssentials?.locations?.find(
      (loc) => loc.slug?.trim() === slug,
    )?.city?.trim();
    return fromLocations || slugToShortLabel(slug);
  })();
  const heroCategoryLabel = readEventCategoryLabel({
    ...s1,
    category_name: s1?.category_name,
  });
  const heroDateLabel = formatEventHeroDateRange(
    (datesForSection ?? []).map((d) => d.event_date),
  );
  const heroTimeLabel = formatEventHeroTimeRange(
    timelineRows.map((row) => row.time),
  );

  const showGallery = (galleryImages?.length ?? 0) > 0;
  const showPackages = Boolean(
    String(activePackage?.package_title ?? "").trim() ||
      String(activePackage?.package_description ?? "").trim() ||
      activePackage?.package_image ||
      (activePackage?.package_details?.length ?? 0) > 0,
  );
  const sectionNavItems = useMemo(
    () =>
      buildEventSectionNavItems({
        about: true,
        rooms: showRoomSelector,
        schedule: showTimeline,
        packages: showPackages,
        dates: true,
        gallery: showGallery,
        menu: showMenu,
        drinks: showDrinks,
        drinksLabel: activeDrinks?.drink_title,
        faqs: showFaqs,
      }),
    [
      showRoomSelector,
      showTimeline,
      showPackages,
      showGallery,
      showMenu,
      showDrinks,
      activeDrinks?.drink_title,
      showFaqs,
    ],
  );
  const showSectionNav = sectionNavItems.length > 0;
  const sectionNavStickyTop = ONBOARDING_PREVIEW_HEADER_OFFSET;
  const roomSelectorStickyTop = showSectionNav
    ? `calc(${ONBOARDING_PREVIEW_HEADER_OFFSET} + ${EVENT_SECTION_NAV_HEIGHT})`
    : ONBOARDING_PREVIEW_HEADER_OFFSET;
  const sectionAnchorClass =
    "scroll-mt-[var(--event-sticky-offset,7.25rem)]";

  const brochureAddress =
    s1?.event_address ||
    slices.eventAddress ||
    activeBrochure?.event_address ||
    data.stepFive?.event_address ||
    "";

  const brochureLat =
    s1?.lat ??
    s1?.latitude ??
    data.lat ??
    data.stepFive?.lat ??
    data.stepFive?.latitude ??
    s8?.latitude ??
    null;
  const brochureLng =
    s1?.long ??
    s1?.longitude ??
    data.long ??
    data.stepFive?.long ??
    data.stepFive?.longitude ??
    s8?.longitude ??
    null;

  return (
    <CartConflictProvider>
      <div
        ref={previewContainerRef}
        className={`event-detail-page @container/preview relative min-w-0 ${
          embedInShell
            ? "h-full max-h-full overflow-y-auto scroll-smooth no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : ""
        } ${
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
                ["--event-sticky-offset" as string]: showSectionNav
                  ? `calc(${ONBOARDING_PREVIEW_HEADER_OFFSET} + ${EVENT_SECTION_NAV_HEIGHT})`
                  : ONBOARDING_PREVIEW_HEADER_OFFSET,
              }
            : {
                ...previewStyles,
                fontFamily: "var(--font-body)",
                ["--event-sticky-offset" as string]: showSectionNav
                  ? `calc(${ONBOARDING_PREVIEW_HEADER_OFFSET} + ${EVENT_SECTION_NAV_HEIGHT})`
                  : ONBOARDING_PREVIEW_HEADER_OFFSET,
              }
        }
      >
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
          hideHeaderPhone
          compactGuestAuth
        />

        {showRoomSelector ? (
          <VendorPreviewRoomSelector
            rooms={slices.rooms}
            currentRoomIndex={currentRoomIndex}
            onRoomChange={handleRoomChange}
            visible={roomSelectorVisible}
            layout="sticky"
            stickyTop={roomSelectorStickyTop}
          />
        ) : null}

        <div>
          <EventHeroBand
            title={heroTitle || eventName}
            subHeading={s1?.event_banner_sub_heading || null}
            accentHint={heroAccentHint}
            headingEmphasis={headingEmphasisForHero}
            bannerHeadingAlign={
              data.banner_heading_align ??
              siteEssentials?.banner_heading_align ??
              null
            }
            bannerHeadingValign={
              data.banner_heading_valign ??
              siteEssentials?.banner_heading_valign ??
              null
            }
            bannerImage={bannerImage || null}
            bannerVideo={bannerVideo}
            cacheBustImage
            imageAlt={eventName}
            breadcrumbs={[
              { label: "Home" },
              ...(heroCityLabel ? [{ label: heroCityLabel }] : []),
              { label: eventName },
            ]}
            categoryLabel={heroCategoryLabel}
            meta={{
              date: heroDateLabel,
              time: heroTimeLabel,
              location: heroCityLabel,
            }}
          />
        </div>

        {showSectionNav ? (
          <EventSectionNav
            items={sectionNavItems}
            stickyTop={sectionNavStickyTop}
            headerOffsetPx={HEADER_OFFSET_PX}
            scrollContainerRef={previewContainerRef}
          />
        ) : null}

        <div id={EVENT_SECTION_IDS.about} className={sectionAnchorClass}>
          <AboutEventSec
            about_event_heading={s1?.about_event_heading || ""}
            about_event_sub_heading={s1?.about_event_sub_heading || ""}
            about_event_description={s1?.about_event_description || ""}
            headingEmphasis={headingEmphasisForHero}
            aboutHeadingAccentHint={heroAccentHint}
          />
        </div>

        {showRoomSelector ? (
          <div ref={chooserRef} id={EVENT_SECTION_IDS.rooms} className={sectionAnchorClass}>
            <EventRoomChooser
              rooms={roomSummaries}
              currentRoomIndex={currentRoomIndex}
              onRoomChange={handleRoomChange}
              headingEmphasis={headingEmphasisForHero}
            />
          </div>
        ) : null}

        {showTimeline ? (
          <div id={EVENT_SECTION_IDS.schedule} className={sectionAnchorClass}>
            <RoomContentTransition roomKey={roomContentKey}>
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
                headingEmphasis={headingEmphasisForHero}
              />
            </RoomContentTransition>
          </div>
        ) : null}

        <div
          id={showPackages ? EVENT_SECTION_IDS.packages : undefined}
          className={showPackages ? sectionAnchorClass : undefined}
        >
          <RoomContentTransition roomKey={roomContentKey}>
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
          </RoomContentTransition>
        </div>

        <div
          ref={bookingRef}
          id="booking"
          className={`${EVENT_BOOKING_SECTION_CLASSNAME} ${sectionAnchorClass}`}
        >
          <RoomContentTransition roomKey={roomContentKey}>
            <DatesSection
              dates={datesForSection}
              eventSlug={eventSlug}
              eventName={eventName}
              eventImage={
                s1?.event_banner_image || s1?.event_banner_video || undefined
              }
              headingEmphasis={headingEmphasisForHero}
            />
          </RoomContentTransition>
        </div>

        {showGallery ? (
          <div id={EVENT_SECTION_IDS.gallery} className={sectionAnchorClass}>
            <EventGallery
              gallery={galleryImages}
              galleryTitle={siteEssentials?.event_gallery_title || undefined}
              headingEmphasis={headingEmphasisForHero}
            />
          </div>
        ) : null}

        {showMenu && (
          <div id={EVENT_SECTION_IDS.menu} className={sectionAnchorClass}>
            <RoomContentTransition roomKey={roomContentKey}>
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
                headingEmphasis={headingEmphasisForHero}
              />
            </RoomContentTransition>
          </div>
        )}

        {showDrinks && (
          <div id={EVENT_SECTION_IDS.drinks} className={sectionAnchorClass}>
            <RoomContentTransition roomKey={roomContentKey}>
              <LazyDrinkSection
                title={activeDrinks?.drink_title || ""}
                description={activeDrinks?.drink_description || ""}
                packages={drinkPackages}
                eventSlug={eventSlug}
                headingEmphasis={headingEmphasisForHero}
              />
            </RoomContentTransition>
          </div>
        )}

        <LazyBrochureSection
          showMapImmediately
          headingEmphasis={headingEmphasisForHero}
          bookNowScrollOffsetPx={HEADER_OFFSET_PX + EVENT_SECTION_NAV_HEIGHT_PX}
          location={{
            title: "EVENT LOCATION",
            description:
              brochureAddress || "Event location will be displayed here",
            icon: "MapPin",
            latitude: brochureLat,
            longitude: brochureLng,
          }}
          price={{
            title: "PRICES FROM",
            description: brochurePriceDescription,
            link: "#booking",
            price_title: "Book Now",
          }}
        />

        {showFaqs && (
          <div id={EVENT_SECTION_IDS.faqs} className={sectionAnchorClass}>
            <LazyFaqSection
              faqs={faqs}
              headingEmphasis={headingEmphasisForHero}
            />
          </div>
        )}

        <FooterSection
          copyright={siteEssentials?.copyright || data.copyright}
          logo={siteEssentials?.logo || data.logo || undefined}
          locationSlug={footerLocationSlug}
          contactTheme={footerContactTheme}
          socialLinksOverride={siteEssentials?.socialLinks}
          brandDescription={
            firstFooterBrandDescription(
              siteEssentials?.footer_brand_description,
              data.footer_brand_description,
              siteEssentials?.about_description,
              data.about_description,
              siteEssentials?.seo?.description,
            )
          }
        />
      </div>
    </CartConflictProvider>
  );
}
