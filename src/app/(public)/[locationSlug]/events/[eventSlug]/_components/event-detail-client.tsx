"use client";

import { useEventDetail } from "../_lib/hooks";
import { EventDetail } from "@/services/common/events/type";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { EventHeroBand } from "@/components/public/event-hero-band";
import {
  EventCouponStrip,
  EVENT_COUPON_STRIP_HEIGHT_PX,
  PUBLIC_EVENT_HEADER_WITH_COUPON_OFFSET,
} from "@/components/public/event-coupon-strip";
import {
  couponToStripProps,
  type CouponStripSource,
} from "@/lib/coupon-strip-props";
import {
  EventRoomSelector,
  PUBLIC_EVENT_HEADER_OFFSET,
} from "@/components/public/event-room-selector";
import { EventRoomChooser } from "@/components/public/event-room-chooser";
import { RoomContentTransition } from "@/components/public/room-content-transition";

import CommonHeader from "@/components/shared/common-header";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import AboutEventSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/About-event-sec";
import { resolveAboutEventImage } from "@/lib/resolve-about-event-image";
import DatesSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Dates-section";
import EventGallery from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Event-gallery";
import PackageSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/package-sec";
import Timeline from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Time-line";
import {
  LazyBrochureSection,
  LazyDrinkSection,
  LazyFaqSection,
  LazyMenuSection,
} from "@/components/public/event-detail-lazy-sections";
import { CartConflictProvider } from "@/app/(public)/vendor/checkout/_components/cart-conflict-provider";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import { cn } from "@/lib/utils";
import { buildEventHeaderDownloadLinks } from "@/lib/event-header-downloads";
import { EVENT_BOOKING_SECTION_CLASSNAME } from "@/lib/event-booking-section-layout";
import { lowestBookableFromPrice } from "@/lib/event-room-chooser-item";
import {
  buildEventHeroBreadcrumbs,
  labelsFromEventHeroSlices,
  readEventCategoryLabel,
} from "@/lib/event-hero-meta";
import { locationDisplayName } from "@/lib/slug-short-label";
import { buildEventAboutHighlights } from "@/lib/event-about-highlights";
import {
  firstBookablePublicRoomIndex,
  isPublicEventRoomMode,
  listPublicEventRoomSummaries,
  resolvePublicEventActiveSlices,
  resolvePublicRoomIndexFromId,
} from "@/lib/resolve-public-event-room-slices";
import { scrollToElementIfNeeded } from "@/lib/scroll-to-element-if-needed";
import {
  EventSectionNav,
  EVENT_SECTION_IDS,
  EVENT_SECTION_NAV_HEIGHT,
  EVENT_SECTION_NAV_HEIGHT_PX,
  buildEventSectionNavItems,
} from "@/components/public/event-section-nav";
import { SkipLink } from "@/components/public/skip-link";
import {
  EVENT_STICKY_SCROLL_MT_FALLBACK,
  buildEventStickyOffsetCssVar,
  resolveBookNowScrollOffsetPx,
} from "@/lib/event-sticky-scroll-offset";

/** Sticky site header height — keep scroll targets / triggers clear of the header. */
const BASE_HEADER_OFFSET_PX = 72;

interface EventDetailClientProps {
  event: EventDetail;
  eventSlug: string;
  locationSlug: string;
  host: string;
}

export default function EventDetailClient({
  event: initialEvent,
  eventSlug,
  locationSlug,
  host,
}: EventDetailClientProps) {
  const { formatCompact: formatPriceUnit } = useCurrencyFormat();
  const { data } = useEventDetail(eventSlug, host);
  const searchParams = useSearchParams();
  const roomIdParam = searchParams.get("roomId");

  const eventData = data?.data || initialEvent;

  const [currentRoomIndex, setCurrentRoomIndex] = useState(() => {
    const fromQuery = resolvePublicRoomIndexFromId(initialEvent, roomIdParam);
    return fromQuery ?? firstBookablePublicRoomIndex(initialEvent);
  });
  const [roomSelectorScrollVisible, setRoomSelectorScrollVisible] =
    useState(false);
  /** Event-level coupon from GET /domain/{domain}/events/{slug}. */
  const bannerCouponSource = useMemo((): CouponStripSource | null => {
    return eventData.coupon ?? null;
  }, [eventData]);

  const couponStripProps = useMemo(
    () => couponToStripProps(bannerCouponSource),
    [bannerCouponSource],
  );

  const [couponStripDismissed, setCouponStripDismissed] = useState(false);
  const showCouponStrip = Boolean(couponStripProps) && !couponStripDismissed;

  const headerOffsetPx =
    BASE_HEADER_OFFSET_PX +
    (showCouponStrip ? EVENT_COUPON_STRIP_HEIGHT_PX : 0);
  const roomBarStickyTop = showCouponStrip
    ? PUBLIC_EVENT_HEADER_WITH_COUPON_OFFSET
    : PUBLIC_EVENT_HEADER_OFFSET;

  const roomPreviewMode = isPublicEventRoomMode(eventData);

  useEffect(() => {
    const fromQuery = resolvePublicRoomIndexFromId(eventData, roomIdParam);
    setCurrentRoomIndex(fromQuery ?? firstBookablePublicRoomIndex(eventData));
    // Reset when event identity / room-mode / deep-linked room changes — not every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eventData read intentionally once per slug/mode/roomId
  }, [eventSlug, roomPreviewMode, roomIdParam]);

  // Deep links such as checkout "Add Dates" (`…#booking`) arrive before the
  // sections render, so the browser's own hash jump lands at the top of the
  // page. Scroll once the target exists (sections carry the sticky scroll-mt).
  useEffect(() => {
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    if (!targetId) return;
    let cancelled = false;
    let frame = 0;
    let attempts = 0;
    const tryScroll = () => {
      if (cancelled) return;
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ block: "start", behavior: "smooth" });
        return;
      }
      if (attempts++ < 60) frame = window.requestAnimationFrame(tryScroll);
    };
    const timer = window.setTimeout(tryScroll, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [eventSlug]);

  const slices = useMemo(
    () => resolvePublicEventActiveSlices(eventData, currentRoomIndex),
    [eventData, currentRoomIndex],
  );

  const roomSummaries = useMemo(
    () => (roomPreviewMode ? listPublicEventRoomSummaries(eventData) : []),
    [roomPreviewMode, eventData],
  );

  const showRoomSelector = roomPreviewMode && roomSummaries.length >= 2;
  const roomSelectorVisible = showRoomSelector && roomSelectorScrollVisible;

  const heroRef = useRef<HTMLElement>(null);
  const chooserRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drinkRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);

  /**
   * Any room change: update the active room, then glide to the dates/booking
   * section when it isn't already in a comfortable viewport band.
   * Double-rAF waits for React to paint the new room content before measuring.
   */
  const handleRoomChange = useCallback(
    (index: number) => {
      const target = roomSummaries[index];
      if (target?.disabled) return;
      setCurrentRoomIndex(index);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToElementIfNeeded(bookingRef.current, {
            headerOffsetPx: resolveBookNowScrollOffsetPx({
              headerOffsetPx,
            }),
          });
        });
      });
    },
    [roomSummaries, headerOffsetPx],
  );

  useEffect(() => {
    if (!showRoomSelector) {
      setRoomSelectorScrollVisible(false);
      return;
    }

    /** Sticky mini-bar appears only once the in-flow chooser scrolls under the header. */
    const handleScroll = () => {
      const chooser = chooserRef.current;
      if (!chooser) {
        setRoomSelectorScrollVisible(window.scrollY > window.innerHeight * 0.6);
        return;
      }
      const { bottom } = chooser.getBoundingClientRect();
      setRoomSelectorScrollVisible(bottom <= headerOffsetPx + 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [showRoomSelector, headerOffsetPx]);

  const heroTitle =
    eventData.event_banner_heading?.trim() ||
    eventData.event_name?.trim() ||
    "";

  const heroAccentHint =
    typeof eventData.event_banner_heading_accent === "string" &&
    eventData.event_banner_heading_accent.trim().length > 0
      ? eventData.event_banner_heading_accent.trim()
      : null;

  const { theme: serverTheme } = useContext(ServerContext) || {
    theme: null,
  };
  const vendorTheme = serverTheme as ThemeSchema | null;
  const headingEmphasisFromSite =
    vendorTheme?.typography?.headingEmphasis != null
      ? normalizeHeadingEmphasis(vendorTheme.typography.headingEmphasis)
      : undefined;

  const pdfDownloadLinks = useMemo(
    () =>
      buildEventHeaderDownloadLinks({
        brochure_pdf: slices.brochure_pdf,
        faq_pdf: eventData.faq_pdf,
        brochure_pdf_2: slices.brochure_pdf_2,
      }),
    [slices.brochure_pdf, slices.brochure_pdf_2, eventData.faq_pdf],
  );

  const timelineRows = useMemo(
    () =>
      (slices.event_schedular ?? [])
        .map((item) => ({
          title: String(item.title ?? "").trim(),
          time: String(item.time ?? "").trim(),
        }))
        .filter((item) => item.title || item.time),
    [slices.event_schedular],
  );

  const showTimeline =
    String(slices.event_schedular_title ?? "").trim().length > 0 ||
    String(slices.event_schedule_subtitle ?? "").trim().length > 0 ||
    timelineRows.length > 0;

  // The schedule is live-tracked only on the event's actual date(s); before/after
  // it stays informational instead of showing a false daily countdown.
  const scheduleEventDates = useMemo(
    () => (slices.dates ?? []).map((d) => d.event_date),
    [slices.dates],
  );

  const drinkPackages = useMemo(
    () =>
      (slices.packages ?? []).map((pkg) => ({
        ...pkg,
        price: parseFloat(pkg.price) || 0,
      })),
    [slices.packages],
  );

  const brochureFromPrice = useMemo(
    () =>
      lowestBookableFromPrice({
        datePrices: (slices.dates ?? []).map((date) => date.price),
        packagePrices: drinkPackages.map((pkg) => pkg.price),
      }),
    [slices.dates, drinkPackages],
  );

  const galleryItems = useMemo(
    () =>
      slices.event_galley?.map((item) => ({
        path: item.url,
        relativePath: item.url,
        preview: item.url,
      })),
    [slices.event_galley],
  );

  const showGallery = (galleryItems?.length ?? 0) > 0;
  const showMenu = Boolean(slices.menus && slices.menus.length > 0);
  const showFaqs = Boolean(eventData.faqs && eventData.faqs.length > 0);
  const showPackages = Boolean(
    String(slices.package_title ?? "").trim() ||
      String(slices.package_description ?? "").trim() ||
      slices.package_image ||
      (slices.package_details?.length ?? 0) > 0,
  );
  const showDrinks = drinkPackages.length > 0;

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
        drinksLabel: slices.drink_title,
        faqs: showFaqs,
      }),
    [
      showRoomSelector,
      showTimeline,
      showPackages,
      showGallery,
      showMenu,
      showDrinks,
      slices.drink_title,
      showFaqs,
    ],
  );
  const showSectionNav = sectionNavItems.length > 0;
  const sectionNavStickyTop = roomBarStickyTop;
  const roomSelectorStickyTop = showSectionNav
    ? `calc(${roomBarStickyTop} + ${EVENT_SECTION_NAV_HEIGHT})`
    : roomBarStickyTop;
  const sectionAnchorClass = `scroll-mt-[var(--event-sticky-offset,${EVENT_STICKY_SCROLL_MT_FALLBACK})]`;

  const eventLocationLabel = (slices.event_address ?? "").trim();
  /** Parent venue location from the URL (`/kangra-7/...`), not the event address. */
  const parentLocationLabel = useMemo(() => {
    const matched = vendorTheme?.locations?.find(
      (loc) => loc.slug?.toLowerCase() === locationSlug.toLowerCase(),
    );
    return locationDisplayName(matched?.city, locationSlug);
  }, [vendorTheme?.locations, locationSlug]);
  const heroCategoryLabel = readEventCategoryLabel(eventData);
  const { date: heroDateLabel, time: heroTimeLabel } = labelsFromEventHeroSlices(
    {
      dates: slices.dates,
      schedule: slices.event_schedular,
    },
  );

  const aboutHighlights = buildEventAboutHighlights({
    occasion: heroCategoryLabel,
    dates: heroDateLabel,
    time: heroTimeLabel,
    location: eventLocationLabel || null,
    fromPrice: brochureFromPrice,
    formatPrice: formatPriceUnit,
  });

  const activeRoomId = slices.activeRoom?.room_id;
  const roomContentKey = activeRoomId ?? `room-${currentRoomIndex}`;

  return (
    <CartConflictProvider>
      <div
        className="event-detail-page"
        style={{
          ["--event-sticky-offset" as string]: buildEventStickyOffsetCssVar({
            headerOffset: roomBarStickyTop,
            showSectionNav,
          }),
        }}
      >
        <SkipLink />
        <CommonHeader
          variant="default"
          headerDownloads={pdfDownloadLinks}
          hideHeaderPhone
          hideBrowseEvents
          compactGuestAuth
          topBanner={
            showCouponStrip && couponStripProps ? (
              <EventCouponStrip
                {...couponStripProps}
                position="static"
                onDismiss={() => setCouponStripDismissed(true)}
              />
            ) : null
          }
        />

        {/* `contents`: landmark only — keeps the page div as the sticky nav's containing block. */}
        <main id="main-content" className="contents">
          {showRoomSelector ? (
            <EventRoomSelector
              rooms={slices.rooms}
              currentRoomIndex={currentRoomIndex}
              onRoomChange={handleRoomChange}
              visible={roomSelectorVisible}
              stickyTop={roomSelectorStickyTop}
            />
          ) : null}

          <div>
            <EventHeroBand
              sectionRef={heroRef}
              title={heroTitle}
              subHeading={eventData.event_banner_sub_heading || null}
              accentHint={heroAccentHint}
              headingEmphasis={headingEmphasisFromSite}
              bannerHeadingAlign={eventData.banner_heading_align ?? null}
              bannerHeadingValign={eventData.banner_heading_valign ?? null}
              bannerImage={eventData.event_banner_image || null}
              bannerVideo={eventData.event_banner_video || null}
              cacheBustImage
              imageAlt={eventData.event_name || "Event banner"}
              breadcrumbs={buildEventHeroBreadcrumbs({
                eventLabel:
                  eventData.event_name?.trim() ||
                  eventData.event_banner_heading?.trim() ||
                  "Event",
                locationLabel: parentLocationLabel,
                homeHref: "/",
                locationHref: `/${locationSlug}`,
              })}
              categoryLabel={heroCategoryLabel}
              meta={{
                date: heroDateLabel,
                time: heroTimeLabel,
                location: eventLocationLabel,
              }}
            />
          </div>

          {showSectionNav ? (
            <EventSectionNav
              items={sectionNavItems}
              stickyTop={sectionNavStickyTop}
              headerOffsetPx={headerOffsetPx}
              bookNowId={EVENT_SECTION_IDS.dates}
            />
          ) : null}

          <div
            ref={aboutRef}
            id={EVENT_SECTION_IDS.about}
            className={sectionAnchorClass}
          >
            <AboutEventSec
              about_event_heading={eventData.about_event_heading}
              about_event_sub_heading={eventData.about_event_sub_heading}
              about_event_description={eventData.about_event_description}
              eventImage={resolveAboutEventImage(
                eventData.about_event_image,
                eventData.event_banner_image,
              )}
              imageAlt={
                eventData.event_name
                  ? `${eventData.event_name} event`
                  : "Event image"
              }
              highlights={aboutHighlights}
              headingEmphasis={headingEmphasisFromSite}
              aboutHeadingAccentHint={heroAccentHint}
            />
          </div>

          {showRoomSelector ? (
            <div
              ref={chooserRef}
              id={EVENT_SECTION_IDS.rooms}
              className={sectionAnchorClass}
            >
              <EventRoomChooser
                rooms={roomSummaries}
                currentRoomIndex={currentRoomIndex}
                onRoomChange={handleRoomChange}
                headingEmphasis={headingEmphasisFromSite}
              />
            </div>
          ) : null}

          {showTimeline ? (
            <div
              ref={timelineRef}
              id={EVENT_SECTION_IDS.schedule}
              className={sectionAnchorClass}
            >
              <RoomContentTransition roomKey={roomContentKey}>
                <Timeline
                  eventSchedular={timelineRows}
                  eventSchedularTitle={slices.event_schedular_title}
                  eventSchedularCopy={slices.event_schedule_subtitle}
                  eventDates={scheduleEventDates}
                  eventSchedularBackgroundImage={
                    typeof slices.event_schedular_background_image === "string"
                      ? slices.event_schedular_background_image
                      : undefined
                  }
                />
              </RoomContentTransition>
            </div>
          ) : null}

          <div
            ref={packageRef}
            id={showPackages ? EVENT_SECTION_IDS.packages : undefined}
            className={showPackages ? sectionAnchorClass : undefined}
          >
            <RoomContentTransition roomKey={roomContentKey}>
              <PackageSec
                heading={slices.package_title}
                subHeading={slices.package_description}
                image={slices.package_image}
                packageDetails={slices.package_details}
                headingEmphasis={headingEmphasisFromSite}
              />
            </RoomContentTransition>
          </div>

          <div
            ref={bookingRef}
            id={EVENT_SECTION_IDS.dates}
            className={cn(EVENT_BOOKING_SECTION_CLASSNAME, sectionAnchorClass)}
          >
            <RoomContentTransition roomKey={roomContentKey}>
              <DatesSection
                dates={slices.dates}
                eventSlug={eventSlug}
                eventName={eventData.event_name}
                eventImage={
                  eventData.event_banner_image ||
                  eventData.event_banner_video ||
                  undefined
                }
                roomId={activeRoomId}
                headingEmphasis={headingEmphasisFromSite}
              />
            </RoomContentTransition>
          </div>

          {showGallery ? (
            <div id={EVENT_SECTION_IDS.gallery} className={sectionAnchorClass}>
              <EventGallery
                gallery={galleryItems}
                headingEmphasis={headingEmphasisFromSite}
              />
            </div>
          ) : null}

          {slices.menus && slices.menus.length > 0 && (
            <div
              ref={menuRef}
              id={EVENT_SECTION_IDS.menu}
              className={sectionAnchorClass}
            >
              <RoomContentTransition roomKey={roomContentKey}>
                <LazyMenuSection
                  menu_title={slices.menu_title}
                  menu_description={slices.menu_description}
                  menus={slices.menus}
                  catering_option={1}
                  menu_background_image={
                    typeof slices.menu_background_image === "string"
                      ? slices.menu_background_image
                      : undefined
                  }
                  headingEmphasis={headingEmphasisFromSite}
                />
              </RoomContentTransition>
            </div>
          )}

          {drinkPackages.length > 0 && (
            <div
              ref={drinkRef}
              id={EVENT_SECTION_IDS.drinks}
              className={sectionAnchorClass}
            >
              <RoomContentTransition roomKey={roomContentKey}>
                <LazyDrinkSection
                  title={slices.drink_title}
                  description={slices.drink_description}
                  packages={drinkPackages}
                  eventSlug={eventSlug}
                  roomId={activeRoomId}
                  headingEmphasis={headingEmphasisFromSite}
                />
              </RoomContentTransition>
            </div>
          )}

          <div>
            <LazyBrochureSection
              showMapImmediately
              headingEmphasis={headingEmphasisFromSite}
              location={{
                title: "EVENT LOCATION",
                description: slices.event_address || "",
                icon: "MapPin",
                latitude: slices.lat,
                longitude: slices.long,
              }}
            />
          </div>

          {eventData.faqs && eventData.faqs.length > 0 && (
            <div
              ref={faqRef}
              id={EVENT_SECTION_IDS.faqs}
              className={sectionAnchorClass}
            >
              <LazyFaqSection
                faqs={eventData.faqs}
                headingEmphasis={headingEmphasisFromSite}
              />
            </div>
          )}
        </main>

        <FooterSection
          locationSlug={locationSlug}
          brandDescription={vendorTheme?.footer_brand_description}
        />
      </div>
    </CartConflictProvider>
  );
}
