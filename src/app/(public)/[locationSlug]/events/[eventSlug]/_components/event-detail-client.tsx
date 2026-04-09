"use client";

import { useEventDetail } from "../_lib/hooks";
import { EventDetail } from "@/services/common/events/type";
import { useContext, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Import event components from onboarding flow
import AboutEventSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/About-event-sec";
import DatesSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Dates-section";
import DrinkSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/drink-section";
import FaqSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/faq-section";
// import Footer from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/footer";
// import Header from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/header";
import MenuSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/menu-section";
import PackageSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/package-sec";
import Timeline from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Time-line";
import BrochureSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/brochure-section";
import CommonHeader from "@/components/shared/common-header";
import { SiteHeading } from "@/components/public/site-heading";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import EventGallery from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Event-gallery";
import { ThemeAnimationManager } from "@/components/theme-animations/theme-animation-manager";
import { CartConflictProvider } from "@/app/(public)/vendor/checkout/_components/cart-conflict-provider";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import {
  heroBandContentPadClass,
  heroBandVerticalClass,
  heroBannerStackClass,
  heroBannerSubheadingClass,
  normalizeBannerHeadingAlign,
  normalizeBannerHeadingValign,
} from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";

function slugToShortLabel(slug: string) {
  if (!slug?.trim()) return "Events";
  const first = slug.split("-")[0]?.trim() || slug;
  if (!first) return "Events";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

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
  const datesSectionRef = useRef<HTMLDivElement>(null);

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
  const bannerValign = normalizeBannerHeadingValign(
    vendorTheme?.banner_heading_valign,
  );
  const headingEmphasisFromSite =
    vendorTheme?.typography?.headingEmphasis != null
      ? normalizeHeadingEmphasis(vendorTheme.typography.headingEmphasis)
      : undefined;

  const heroStyles = {
    videoBackground: "absolute inset-0 h-full w-full object-cover",
  };

  return (
    <CartConflictProvider>
      <div className="event-detail-page">
        {/* Theme Animations */}
        <ThemeAnimationManager
          eventData={eventData}
          enabled={false}
          intensity="medium"
        />

        <CommonHeader variant="default" />

        {/* Hero band + fade into page background; heading uses surface colors over the fade */}
        <section
          ref={heroRef}
          className={cn(
            "relative mx-auto flex w-full justify-center overflow-hidden",
            "h-[min(70dvh,760px)] min-h-[400px] max-h-[820px]",
            heroBandVerticalClass(bannerValign),
            bannerAlign === "left" &&
              bannerValign === "center" &&
              "!items-stretch",
          )}
        >
          <div className="absolute inset-0 overflow-hidden">
            {eventData.event_banner_video ? (
              <>
                {eventData.event_banner_image && (
                  <div
                    className={`${heroStyles.videoBackground} scale-105 bg-cover bg-center`}
                    style={{
                      backgroundImage: `url(${eventData.event_banner_image})`,
                    }}
                  />
                )}
                <video
                  src={eventData.event_banner_video}
                  poster={eventData.event_banner_image || undefined}
                  className={cn(heroStyles.videoBackground, "scale-105")}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                />
              </>
            ) : eventData.event_banner_image ? (
              // eslint-disable-next-line @next/next/no-img-element -- external vendor URLs + cache busting
              <img
                src={addCacheBusting(eventData.event_banner_image)}
                alt={eventData.event_name || "Event banner"}
                className={cn(heroStyles.videoBackground, "scale-105")}
              />
            ) : (
              <div
                className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-background)] to-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-background))]"
                aria-hidden
              />
            )}
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/35 to-[color:var(--color-background)]"
              aria-hidden
            />
          </div>

          <div
            className="pointer-events-none absolute left-1/4 top-16 z-[2] h-72 w-72 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] blur-[100px] md:h-96 md:w-96 md:blur-[120px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-24 right-1/4 z-[2] h-64 w-64 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] blur-[90px]"
            aria-hidden
          />

          <div
            className={cn(
              "relative z-20 max-w-7xl mx-auto w-full overflow-visible px-4",
              heroBandContentPadClass(bannerValign),
            )}
          >
            <div
              className={cn(
                heroBannerStackClass(bannerAlign),
                "overflow-visible",
              )}
            >
              <Link
                href={`/${locationSlug}`}
                className={cn(
                  "mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white",
                  bannerAlign === "center" && "mx-auto",
                  bannerAlign === "right" && "ml-auto",
                )}
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                Back to {slugToShortLabel(locationSlug)}
              </Link>
              {/* onDark: light copy + text-shadow over imagery (onSurface was invisible on dark photos) */}
              <SiteHeading
                level={1}
                title={heroTitle}
                accentHint={heroAccentHint}
                emphasis={headingEmphasisFromSite}
                variant="onDark"
                align={bannerAlign}
                className={cn(
                  "mb-4 font-black !text-3xl !leading-[0.98] tracking-tight sm:!text-4xl md:!text-5xl lg:!text-6xl",
                  bannerAlign === "left"
                    ? "max-w-[min(100%,28rem)] sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
                    : "max-w-4xl",
                )}
              />
              {eventData.event_banner_sub_heading ? (
                <p
                  className={cn(
                    "max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg md:text-xl",
                    heroBannerSubheadingClass(bannerAlign),
                  )}
                >
                  {eventData.event_banner_sub_heading}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* About Section */}
        <div ref={aboutRef}>
          <AboutEventSec
            about_event_heading={eventData.about_event_heading}
            about_event_sub_heading={eventData.about_event_sub_heading}
            about_event_description={eventData.about_event_description}
            headingEmphasis={headingEmphasisFromSite}
            aboutHeadingAccentHint={eventData.event_banner_heading_accent}
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
            subHeading={eventData.package_sub_title}
            image={eventData.package_image}
            buttonName={eventData.package_button_name || "Book Now"}
            buttonLink="#booking"
            packageDetails={eventData.package_details}
            headingEmphasis={headingEmphasisFromSite}
            headingAccentHint="Packages"
          />
        </div>
        {/* Booking Section */}
        <div ref={bookingRef} id="booking">
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
            <MenuSection
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
            <DrinkSection
              title={eventData.drink_title}
              description={eventData.drink_description}
              packages={eventData.packages.map((pkg) => ({
                ...pkg,
                price: parseFloat(pkg.price) || 0,
              }))}
              eventSlug={eventSlug}
            />
          </div>
        )}
        <div ref={datesSectionRef}>
          <BrochureSection
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
            downloads={[
              ...(eventData.brochure_pdf
                ? [
                    {
                      title: "Event Details",
                      download_link: [eventData.brochure_pdf],
                    },
                  ]
                : []),
              ...(eventData.faq_pdf
                ? [
                    {
                      title: "FAQ Details",
                      download_link: [eventData.faq_pdf],
                    },
                  ]
                : []),
              ...(eventData.brochure_pdf_2
                ? [
                    {
                      title: "Event Flayer",
                      download_link: [eventData.brochure_pdf_2],
                    },
                  ]
                : []),
            ]}
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
            <FaqSection faqs={eventData.faqs} />
          </div>
        )}

        {/* Footer */}
        <FooterSection />
      </div>
    </CartConflictProvider>
  );
}
