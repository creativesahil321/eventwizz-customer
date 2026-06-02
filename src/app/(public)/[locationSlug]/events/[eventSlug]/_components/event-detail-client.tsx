"use client";

import { useEventDetail } from "../_lib/hooks";
import { EventDetail } from "@/services/common/events/type";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventHeroBand } from "@/components/public/event-hero-band";
import { EventRoomSelector } from "@/components/public/event-room-selector";
import { ONBOARDING_ROOM_SELECTOR_SCROLL_THRESHOLD_PX } from "@/app/(on-boarding)/on-boarding/_components/form-preview/preview-layout-constants";

import CommonHeader from "@/components/shared/common-header";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import AboutEventSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/About-event-sec";
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
import { ThemeAnimationManager } from "@/components/theme-animations/theme-animation-manager";
import { CartConflictProvider } from "@/app/(public)/vendor/checkout/_components/cart-conflict-provider";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import { normalizeBannerHeadingAlign } from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";
import { buildEventHeaderDownloadLinks } from "@/lib/event-header-downloads";
import { EVENT_BOOKING_SECTION_CLASSNAME } from "@/lib/event-booking-section-layout";
import { slugToShortLabel } from "@/lib/slug-short-label";
import {
  isPublicEventRoomMode,
  resolvePublicEventActiveSlices,
} from "@/lib/resolve-public-event-room-slices";

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

  const eventData = data?.data || initialEvent;

  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [roomSelectorScrollVisible, setRoomSelectorScrollVisible] =
    useState(false);

  const roomPreviewMode = isPublicEventRoomMode(eventData);

  useEffect(() => {
    setCurrentRoomIndex(0);
  }, [eventSlug, roomPreviewMode]);

  const slices = useMemo(
    () => resolvePublicEventActiveSlices(eventData, currentRoomIndex),
    [eventData, currentRoomIndex],
  );

  const showRoomSelector = roomPreviewMode && slices.rooms.length >= 2;
  const roomSelectorVisible = showRoomSelector && roomSelectorScrollVisible;

  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drinkRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showRoomSelector) {
      setRoomSelectorScrollVisible(false);
      return;
    }

    const threshold = ONBOARDING_ROOM_SELECTOR_SCROLL_THRESHOLD_PX;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const height = window.innerHeight;
      setRoomSelectorScrollVisible(
        scrollTop >= Math.max(threshold, height * 0.22),
      );
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showRoomSelector]);

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
  const bannerAlign = normalizeBannerHeadingAlign(
    vendorTheme?.banner_heading_align,
  );
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
    [
      slices.brochure_pdf,
      slices.brochure_pdf_2,
      eventData.faq_pdf,
    ],
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
    timelineRows.length > 0;

  const drinkPackages = useMemo(
    () =>
      (slices.packages ?? []).map((pkg) => ({
        ...pkg,
        price: parseFloat(pkg.price) || 0,
      })),
    [slices.packages],
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

  const activeRoomId = slices.activeRoom?.room_id;

  return (
    <CartConflictProvider>
      <div className="event-detail-page">
        <ThemeAnimationManager
          eventData={eventData}
          enabled={true}
          intensity="medium"
        />

        <CommonHeader
          variant="default"
          headerDownloads={pdfDownloadLinks}
          hideHeaderPhone
          compactGuestAuth
        />

        {showRoomSelector ? (
          <EventRoomSelector
            rooms={slices.rooms}
            currentRoomIndex={currentRoomIndex}
            onRoomChange={setCurrentRoomIndex}
            visible={roomSelectorVisible}
          />
        ) : null}

        <div
          className={cn(
            roomSelectorVisible && "-mt-12 transition-all duration-300",
          )}
        >
          <EventHeroBand
            sectionRef={heroRef}
            title={heroTitle}
            subHeading={eventData.event_banner_sub_heading || null}
            accentHint={heroAccentHint}
            headingEmphasis={headingEmphasisFromSite}
            bannerHeadingAlign={vendorTheme?.banner_heading_align ?? null}
            bannerHeadingValign={vendorTheme?.banner_heading_valign ?? null}
            bannerImage={eventData.event_banner_image || null}
            bannerVideo={eventData.event_banner_video || null}
            cacheBustImage
            imageAlt={eventData.event_name || "Event banner"}
            beforeTitle={
              <Link
                href={`/${locationSlug}`}
                className={cn(
                  "mb-6 inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-200",
                  "rounded-full px-3 py-1.5 text-white/80",
                  "hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] hover:scale-[1.02] hover:shadow-md",
                  bannerAlign === "left" && "-ml-3",
                  bannerAlign === "center" && "mx-auto",
                  bannerAlign === "right" && "ml-auto",
                )}
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                Back to {slugToShortLabel(locationSlug)}
              </Link>
            }
          />
        </div>

        <div ref={aboutRef}>
          <AboutEventSec
            about_event_heading={eventData.about_event_heading}
            about_event_sub_heading={eventData.about_event_sub_heading}
            about_event_description={eventData.about_event_description}
            headingEmphasis={headingEmphasisFromSite}
            aboutHeadingAccentHint={heroAccentHint}
          />
        </div>

        {showTimeline ? (
          <div ref={timelineRef}>
            <Timeline
              eventSchedular={timelineRows}
              eventSchedularTitle={slices.event_schedular_title}
              eventSchedularBackgroundImage={
                typeof slices.event_schedular_background_image === "string"
                  ? slices.event_schedular_background_image
                  : undefined
              }
            />
          </div>
        ) : null}

        <div ref={packageRef}>
          <PackageSec
            heading={slices.package_title}
            subHeading={slices.package_description}
            image={slices.package_image}
            buttonName={slices.package_button_name || "Book Now"}
            buttonLink="#booking"
            packageDetails={slices.package_details}
            headingEmphasis={headingEmphasisFromSite}
          />
        </div>

        <div
          ref={bookingRef}
          id="booking"
          className={EVENT_BOOKING_SECTION_CLASSNAME}
        >
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
          />
        </div>

        <EventGallery gallery={galleryItems} />

        {slices.menus && slices.menus.length > 0 && (
          <div ref={menuRef}>
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
            />
          </div>
        )}

        {drinkPackages.length > 0 && (
          <div ref={drinkRef}>
            <LazyDrinkSection
              title={slices.drink_title}
              description={slices.drink_description}
              packages={drinkPackages}
              eventSlug={eventSlug}
            />
          </div>
        )}

        <div>
          <LazyBrochureSection
            showMapImmediately
            location={{
              title: "EVENT LOCATION",
              description:
                slices.event_address ||
                "Event location will be displayed here",
              icon: "MapPin",
              latitude: slices.lat,
              longitude: slices.long,
            }}
            downloads={pdfDownloadLinks.map((d) => ({
              title: d.title,
              download_link: [d.href],
            }))}
            price={{
              title: "PRICES FROM",
              description: `${formatPriceUnit(
                Number(slices.packages?.[0]?.price) || 45,
              )} PP exc VAT`,
              link: "#booking",
              price_title: "Book Now",
            }}
          />
        </div>

        {eventData.faqs && eventData.faqs.length > 0 && (
          <div ref={faqRef}>
            <LazyFaqSection faqs={eventData.faqs} />
          </div>
        )}

        <FooterSection />
      </div>
    </CartConflictProvider>
  );
}
