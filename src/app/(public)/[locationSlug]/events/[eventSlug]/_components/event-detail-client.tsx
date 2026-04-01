"use client";

import { useEventDetail } from "../_lib/hooks";
import { EventDetail } from "@/services/common/events/type";
import { useRef } from "react";

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
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import EventGallery from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Event-gallery";
import { ThemeAnimationManager } from "@/components/theme-animations/theme-animation-manager";
import { CartConflictProvider } from "@/app/(public)/vendor/checkout/_components/cart-conflict-provider";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface EventDetailClientProps {
  event: EventDetail;
  eventSlug: string;
  locationSlug?: string;
  host: string;
}

export default function EventDetailClient({
  event: initialEvent,
  eventSlug,
  host,
}: EventDetailClientProps) {
  const { formatCompact: formatPriceUnit } = useCurrencyFormat();
  // Fetch event data using TanStack Query
  const { data } = useEventDetail(eventSlug, host);

  // Use fetched data or initial SSR data
  const eventData = data?.data || initialEvent;

  // Refs for each section
  const heroRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drinkRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);
  const datesSectionRef = useRef<HTMLDivElement>(null);

  // Enhanced hero section styles
  const heroStyles = {
    container: "relative w-full h-[100vh] min-h-[500px] overflow-hidden",
    overlay: "absolute inset-0 bg-black/40 z-10",
    videoBackground: "absolute inset-0 w-full h-full object-cover",
    content:
      "relative z-20 flex flex-col justify-center items-center h-full text-center text-white px-4",
    heading: "text-4xl md:text-5xl lg:text-6xl font-bold mb-4",
    subheading: "text-xl md:text-2xl font-medium max-w-3xl mx-auto",
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

        {/* Enhanced Hero Section */}
        <div ref={heroRef} className={heroStyles.container}>
          {eventData.event_banner_video ? (
            <>
              {/* Preload the banner image as a poster for the video */}
              {eventData.event_banner_image && (
                <div
                  className={`${heroStyles.videoBackground} bg-cover bg-center`}
                  style={{
                    backgroundImage: `url(${eventData.event_banner_image})`,
                  }}
                />
              )}
              <video
                src={eventData.event_banner_video}
                poster={eventData.event_banner_image}
                className={heroStyles.videoBackground}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </>
          ) : (
            eventData.event_banner_image && (
              <img
                src={addCacheBusting(eventData.event_banner_image)}
                alt={eventData.event_name || "Event banner"}
                className={heroStyles.videoBackground}
                style={{ objectFit: "cover" }}
              />
            )
          )}
          <div className={heroStyles.overlay}></div>
          <div className={heroStyles.content}>
            <h1 className={heroStyles.heading}>
              {eventData.event_banner_heading || eventData.event_name}
            </h1>
            <h2 className={heroStyles.subheading}>
              {eventData.event_banner_sub_heading}
            </h2>
          </div>
        </div>

        {/* About Section */}
        <div ref={aboutRef}>
          <AboutEventSec
            about_event_heading={eventData.about_event_heading}
            about_event_sub_heading={eventData.about_event_sub_heading}
            about_event_description={eventData.about_event_description}
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
