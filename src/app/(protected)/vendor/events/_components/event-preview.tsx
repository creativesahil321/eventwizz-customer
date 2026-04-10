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
import { themeDetectionFromVendorEventData } from "@/lib/theme-detection-source";
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
import { ThemeAnimationManager } from "@/components/theme-animations/theme-animation-manager";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { SiteHeading } from "@/components/public/site-heading";
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

  const bannerAlign = normalizeBannerHeadingAlign(
    siteEssentials?.banner_heading_align,
  );
  const bannerValign = normalizeBannerHeadingValign(
    siteEssentials?.banner_heading_valign,
  );
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
  // `price_start_from` is stored as a plain number string (e.g. "50") — always format with tenant currency like onboarding / live brochure.
  const rawPriceFrom = s6?.price_start_from?.trim() ?? "";
  const parsedFromField =
    rawPriceFrom !== ""
      ? parseFloat(rawPriceFrom.replace(/[^0-9.-]/g, ""))
      : NaN;
  const brochureAmount =
    rawPriceFrom !== "" &&
    Number.isFinite(parsedFromField) &&
    parsedFromField >= 0
      ? parsedFromField
      : brochureFallbackAmount;
  const brochurePriceDescription = `${formatMoney(brochureAmount)} PP exc VAT`;

  const heroStyles = {
    videoBackground: "absolute inset-0 h-full w-full object-cover",
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
        })
      : undefined;

  return (
    <CartConflictProvider>
      <div
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
        />

        {/* Hero — mirrors live event-detail-client: band height, gradient fade, orbs, theme vertical placement */}
        <section
          className={cn(
            "relative mx-auto flex w-full justify-center overflow-hidden",
            /* Same band dimensions as live event page */
            "h-[min(70dvh,760px)] min-h-[400px] max-h-[820px]",
            heroBandVerticalClass(bannerValign),
            bannerAlign === "left" &&
              bannerValign === "center" &&
              "!items-stretch",
          )}
        >
          <div className="absolute inset-0 overflow-hidden">
            {bannerVideo ? (
              <>
                {bannerImage && (
                  <div
                    className={`${heroStyles.videoBackground} scale-105 bg-cover bg-center`}
                    style={{ backgroundImage: `url(${bannerImage})` }}
                  />
                )}
                <video
                  src={bannerVideo}
                  poster={bannerImage || undefined}
                  className={cn(heroStyles.videoBackground, "scale-105")}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                />
              </>
            ) : bannerImage ? (
              <img
                src={addCacheBusting(bannerImage)}
                alt={eventName}
                className={cn(heroStyles.videoBackground, "scale-105")}
              />
            ) : (
              <div
                className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-background)] to-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-background))]"
                aria-hidden
              />
            )}
            {/* Gradient scrim: dark top → fade to page background (same as live) */}
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/35 to-[color:var(--color-background)]"
              aria-hidden
            />
          </div>

          {/* Primary glow orbs */}
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
              <SiteHeading
                level={1}
                title={heroTitle || eventName}
                accentHint={heroAccentHint}
                emphasis={headingEmphasisForHero}
                variant="onDark"
                align={bannerAlign}
                className={cn(
                  "mb-4 font-black !text-3xl !leading-[0.98] tracking-tight sm:!text-4xl md:!text-5xl lg:!text-6xl",
                  bannerAlign === "left"
                    ? "max-w-[min(100%,28rem)] sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
                    : "max-w-4xl",
                )}
              />
              {s1?.event_banner_sub_heading ? (
                <p
                  className={cn(
                    "max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg md:text-xl",
                    heroBannerSubheadingClass(bannerAlign),
                  )}
                >
                  {s1.event_banner_sub_heading}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <AboutEventSec
          about_event_heading={s1?.about_event_heading || ""}
          about_event_sub_heading={s1?.about_event_sub_heading || ""}
          about_event_description={s1?.about_event_description || ""}
          headingEmphasis={headingEmphasisForHero}
          aboutHeadingAccentHint={heroAccentHint}
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
          headingEmphasis={headingEmphasisForHero}
        />

        <div id="booking">
          <DatesSection
            dates={datesForSection}
            eventSlug={eventSlug}
            eventName={eventName}
            eventImage={
              s1?.event_banner_image || s1?.event_banner_video || undefined
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
                : (s4?.menu_background_image ?? undefined)
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
          showMapImmediately
          location={{
            title: "EVENT LOCATION",
            description:
              s6?.event_address || "Event location will be displayed here",
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
