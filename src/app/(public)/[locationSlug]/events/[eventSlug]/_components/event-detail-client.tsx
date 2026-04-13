"use client";

import { useEventDetail } from "../_lib/hooks";
import { EventDetail } from "@/services/common/events/type";
import { useContext, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventHeroBand } from "@/components/public/event-hero-band";

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
  // Fetch event data using TanStack Query
  const { data } = useEventDetail(eventSlug, host);

  // Use fetched data or initial SSR data
  const eventData = data?.data || initialEvent;

  // Refs for each section
  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drinkRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);

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
        brochure_pdf: eventData.brochure_pdf,
        faq_pdf: eventData.faq_pdf,
        brochure_pdf_2: eventData.brochure_pdf_2,
      }),
    [
      eventData.brochure_pdf,
      eventData.faq_pdf,
      eventData.brochure_pdf_2,
    ],
  );

  return (
    <CartConflictProvider>
      <div className="event-detail-page">
        {/* Theme Animations */}
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

        {/* About Section */}
        <div ref={aboutRef}>
          <AboutEventSec
            about_event_heading={eventData.about_event_heading}
            about_event_sub_heading={eventData.about_event_sub_heading}
            about_event_description={eventData.about_event_description}
            headingEmphasis={headingEmphasisFromSite}
            aboutHeadingAccentHint={heroAccentHint}
          />
        </div>

        {/* Timeline Section */}
        <div ref={timelineRef}>
          <Timeline
            eventSchedular={eventData.event_schedular}
            eventSchedularTitle={eventData.event_schedular_title}
            eventSchedularBackgroundImage={
              typeof eventData.event_schedular_background_image === "string"
                ? eventData.event_schedular_background_image
                : undefined
            }
          />
        </div>

        {/* Package Section */}
        <div ref={packageRef}>
          <PackageSec
            heading={eventData.package_title}
            subHeading={(
              eventData.package_description ??
              eventData.package_sub_title ??
              ""
            ).trim()}
            image={eventData.package_image}
            buttonName={eventData.package_button_name || "Book Now"}
            buttonLink="#booking"
            packageDetails={eventData.package_details}
            headingEmphasis={headingEmphasisFromSite}
          />
        </div>
        {/* Booking Section */}
        <div
          ref={bookingRef}
          id="booking"
          className={EVENT_BOOKING_SECTION_CLASSNAME}
        >
          <DatesSection
            dates={eventData.dates}
            eventSlug={eventSlug}
            eventName={eventData.event_name}
            eventImage={
              eventData.event_banner_image ||
              eventData.event_banner_video ||
              undefined
            }
          />
        </div>

        <EventGallery
          gallery={eventData.event_galley?.map((item) => ({
            path: item.url,
            relativePath: item.url,
            preview: item.url,
          }))}
        />

        {/* Menu Section */}
        {eventData.menus && eventData.menus.length > 0 && (
          <div ref={menuRef}>
            <LazyMenuSection
              menu_title={eventData.menu_title}
              menu_description={eventData.menu_description}
              menus={eventData.menus}
              catering_option={1}
              menu_background_image={
                typeof eventData.menu_background_image === "string"
                  ? eventData.menu_background_image
                  : undefined
              }
            />
          </div>
        )}

        {/* Drink Section */}
        {eventData.packages && eventData.packages.length > 0 && (
          <div ref={drinkRef}>
            <LazyDrinkSection
              title={eventData.drink_title}
              description={eventData.drink_description}
              packages={(eventData.packages ?? []).map((pkg) => ({
                ...pkg,
                price: parseFloat(pkg.price) || 0,
              }))}
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
                eventData.event_address ||
                "Event location will be displayed here",
              icon: "MapPin",
              latitude: eventData.lat,
              longitude: eventData.long,
            }}
            downloads={pdfDownloadLinks.map((d) => ({
              title: d.title,
              download_link: [d.href],
            }))}
            price={{
              title: "PRICES FROM",
              description: `${formatPriceUnit(
                Number(eventData.packages?.[0]?.price) || 45,
              )} PP exc VAT`,
              link: "#booking",
              price_title: "Book Now",
            }}
          />
        </div>

        {/* FAQ Section */}
        {eventData.faqs && eventData.faqs.length > 0 && (
          <div ref={faqRef}>
            <LazyFaqSection faqs={eventData.faqs} />
          </div>
        )}

        {/* Footer */}
        <FooterSection />
      </div>
    </CartConflictProvider>
  );
}
