"use client";

import React from "react";

import AboutEventSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/About-event-sec";
import DatesSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Dates-section";
import BrochureSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/brochure-section";
import DrinkSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/drink-section";
import FaqSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/faq-section";
import MenuSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/menu-section";
import PackageSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/package-sec";
import Timeline from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Time-line";
import CommonHeader from "@/components/shared/common-header";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import { EventDetailData } from "@/services/vendor/events/type";

import EventGallery from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Event-gallery";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import {
  getAnchorColor,
  pickReadableForeground,
  relativeLuminance,
} from "@/lib/color-contrast";
import { CartConflictProvider } from "@/app/(public)/vendor/checkout/_components/cart-conflict-provider";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

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

/** Mirrors `EventDetailClient` section order, hero, conditionals, and brochure/footer so vendor + admin preview match the live event page. */
export function EventPreview({
  data,
  siteEssentials,
  embedInShell = false,
}: EventPreviewProps) {
  const { format: formatMoney } = useCurrencyFormat();
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
  const s3 = data.stepThree;
  const s4 = data.stepFour;
  const s5 = data.stepFive;
  const s6 = data.stepSix;
  const s7 = data.stepSeven;
  const s8 = data.stepEight;

  const eventName = s1?.event_name || s1?.event_banner_heading || "Event";
  const eventSlug =
    data.slug?.trim() ||
    (s1?.event_id != null ? `event-${s1.event_id}` : "preview");

  const datesForSection =
    s3?.dates?.map((date) => {
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
    }) || [];

  const menus = s4?.menus ?? [];
  const showMenu = menus.length > 0;

  const drinkPackages = (s5?.packages ?? []).map((p) => ({
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

  const firstPkg = s5?.packages?.[0];
  const brochureFallbackAmount =
    firstPkg != null
      ? typeof firstPkg.price === "number"
        ? firstPkg.price
        : parseFloat(String(firstPkg.price || 0)) || 45
      : 45;
  const brochurePriceDescription =
    s6?.price_start_from?.trim() ||
    `${formatMoney(brochureFallbackAmount)} PP exc VAT`;

  const heroStyles = {
    container: "relative w-full h-[100vh] min-h-[500px] overflow-hidden",
    overlay: "absolute inset-0 bg-black/40 z-10",
    videoBackground: "absolute inset-0 w-full h-full object-cover",
    content:
      "relative z-20 flex flex-col justify-center items-center h-full text-center text-white px-4",
    heading: "text-4xl md:text-5xl lg:text-6xl font-bold mb-4",
    subheading: "text-xl md:text-2xl font-medium max-w-3xl mx-auto",
  };

  const bannerImage = s1?.event_banner_image || "";
  const bannerVideo = s1?.event_banner_video || null;

  const galleryImages =
    s2?.gallery && s2.gallery.length > 0
      ? s2.gallery.map((image) => {
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
          if (
            typeof image === "object" &&
            image !== null &&
            "url" in image
          ) {
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
        })
      : undefined;

  return (
    <CartConflictProvider>
      <div
        className={`event-detail-page ${
          themeColors.background?.includes("linear-gradient")
            ? "bg-none"
            : "bg-[color:var(--color-background)]"
        } text-[color:var(--color-text)] font-[var(--font-body)]`}
        style={
          themeColors.background?.includes("linear-gradient")
            ? { ...previewStyles, background: themeColors.background }
            : previewStyles
        }
      >
        <SiteEssentialsGoogleFontsLoader
          linkId="site-essentials-google-fonts-event-preview"
          headingStack={headingFont}
          bodyStack={bodyFont}
        />

        <CommonHeader
          contact_number={contactNumber}
          logo={siteEssentials?.logo || data.logo || null}
          variant="preview"
          previewBackButtonOffset={!embedInShell}
          className={embedInShell ? "px-3 sm:px-4 md:px-6" : ""}
        />

        {/* Same hero structure as live `EventDetailClient` */}
        <div className={heroStyles.container}>
          {bannerVideo ? (
            <>
              {bannerImage && (
                <div
                  className={`${heroStyles.videoBackground} bg-cover bg-center`}
                  style={{
                    backgroundImage: `url(${bannerImage})`,
                  }}
                />
              )}
              <video
                src={bannerVideo}
                poster={bannerImage || undefined}
                className={heroStyles.videoBackground}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </>
          ) : (
            bannerImage && (
              <img
                src={addCacheBusting(bannerImage)}
                alt={eventName}
                className={heroStyles.videoBackground}
                style={{ objectFit: "cover" }}
              />
            )
          )}
          <div className={heroStyles.overlay} />
          <div className={heroStyles.content}>
            <h1 className={heroStyles.heading}>
              {s1?.event_banner_heading || eventName}
            </h1>
            <h2 className={heroStyles.subheading}>
              {s1?.event_banner_sub_heading || ""}
            </h2>
          </div>
        </div>

        <AboutEventSec
          about_event_heading={s1?.about_event_heading || ""}
          about_event_sub_heading={s1?.about_event_sub_heading || ""}
          about_event_description={s1?.about_event_description || ""}
        />

        <Timeline
          eventSchedular={s1?.event_schedular || []}
          eventSchedularTitle={s1?.event_schedular_title || ""}
          eventSchedularBackgroundImage={
            typeof s1?.event_schedular_background_image === "string"
              ? s1.event_schedular_background_image
              : undefined
          }
        />

        <PackageSection
          heading={s2?.package_title || ""}
          subHeading={s2?.package_description || ""}
          buttonName={s2?.package_button_name || "Book Now"}
          buttonLink="#booking"
          image={s2?.package_image || null}
          packageDetails={s2?.package_details || []}
        />

        <div id="booking">
          <DatesSection
            dates={datesForSection}
            eventSlug={eventSlug}
            eventName={eventName}
            eventImage={
              s1?.event_banner_image ||
              s1?.event_banner_video ||
              undefined
            }
          />
        </div>

        <EventGallery
          gallery={
            galleryImages ??
            Array(8).fill({
              path: "/assets/images/gallery-image.png",
              relativePath: "/assets/images/gallery-image.png",
              preview: "/assets/images/gallery-image.png",
            })
          }
        />

        {showMenu && (
          <MenuSection
            menu_title={s4?.menu_title || ""}
            menu_description={s4?.menu_description || ""}
            menus={menus}
            catering_option={1}
            menu_background_image={
              typeof s4?.menu_background_image === "string"
                ? s4.menu_background_image
                : s4?.menu_background_image ?? undefined
            }
          />
        )}

        {showDrinks && (
          <DrinkSection
            title={s5?.drink_title || ""}
            description={s5?.drink_description || ""}
            packages={drinkPackages}
            eventSlug={eventSlug}
          />
        )}

        <BrochureSection
          location={{
            title: "EVENT LOCATION",
            description:
              s6?.event_address ||
              "Event location will be displayed here",
            icon: "MapPin",
            latitude: data.lat ?? s8?.latitude ?? null,
            longitude: data.long ?? s8?.longitude ?? null,
          }}
          downloads={[
            ...(s6?.brochure_pdf
              ? [
                  {
                    title: "Event Details",
                    download_link: [s6.brochure_pdf],
                  },
                ]
              : []),
            ...(s6?.faq_pdf
              ? [
                  {
                    title: "FAQ Details",
                    download_link: [s6.faq_pdf],
                  },
                ]
              : []),
            ...(s6?.brochure_pdf_2
              ? [
                  {
                    title: "Event Flayer",
                    download_link: [s6.brochure_pdf_2],
                  },
                ]
              : []),
          ]}
          price={{
            title: "PRICES FROM",
            description: brochurePriceDescription,
            link: "#booking",
            price_title: "Book Now",
          }}
        />

        {showFaqs && <FaqSection faqs={faqs} />}

        <FooterSection logo={siteEssentials?.logo || data.logo || undefined} />
      </div>
    </CartConflictProvider>
  );
}
