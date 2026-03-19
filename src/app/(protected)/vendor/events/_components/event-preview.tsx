import React from "react";

import AboutEventSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/About-event-sec";
import DatesSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Dates-section";
import BrochureSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/brochure-section";
import DrinkSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/drink-section";
import EventHeroSec from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Event-hero-sec";
import FaqSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/faq-section";
import CommonHeader from "@/components/shared/common-header";
import PackageSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/package-sec";
import Timeline from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Time-line";
import FooterSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/footer";
import { EventDetailData } from "@/services/vendor/events/type";

// ServerContextProvider removed - already provided at layout level
// ThemeSchema import removed - no longer needed
import MenuSection from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/menu-section";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import EventGallery from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Event-gallery";

interface EventPreviewProps {
  data: EventDetailData;
  siteEssentials?: SiteEssentialsFormValues | null;
}

export function EventPreview({ data, siteEssentials }: EventPreviewProps) {
  // Use site essentials data if available, otherwise fall back to defaults
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

  const themeTypography = siteEssentials?.typography || {
    fontFamily: {
      heading: "'Inter', sans-serif",
      body: "'Inter', sans-serif",
    },
  };

  // Ensure font family values are always strings
  const headingFont =
    themeTypography.fontFamily?.heading || "'Inter', sans-serif";
  const bodyFont = themeTypography.fontFamily?.body || "'Inter', sans-serif";

  // Apply theme colors as CSS variables
  const previewStyles = {
    "--color-primary": themeColors.primary || "#0F172A",
    "--color-secondary": themeColors.secondary || "#64748B",
    "--color-header": themeColors.header || "#FFFFFF",
    "--color-footer": themeColors.footer || "#0F172A",
    "--color-background": themeColors.background || "#F8FAFC",
    "--color-text": themeColors.text || "#0F172A",
    "--color-text-dimmed": themeColors.textDimmed || "#64748B",
    "--color-surface": themeColors.surface || "#FFFFFF",
    "--font-heading": headingFont,
    "--font-body": bodyFont,
  } as React.CSSProperties;

  // Theme object removed - ServerContext already provided at layout level

  return (
    <div
      style={previewStyles}
      className={`${
        themeColors.background?.includes("linear-gradient")
          ? "bg-none"
          : "bg-[color:var(--color-background)]"
      } text-[color:var(--color-text)] font-[var(--font-body)]`}
      {...(themeColors.background?.includes("linear-gradient") && {
        style: {
          ...previewStyles,
          background: themeColors.background,
        },
      })}
    >
      {/* ServerContext already provided at layout level - no need to wrap again */}
      {/* Header */}
      <CommonHeader
        contact_number={data.stepEight?.contact_number || ""}
        logo={siteEssentials?.logo || data.logo || null}
        variant="preview"
      />

      {/* Hero */}
      <EventHeroSec
        heading={data.stepOne?.event_banner_heading || ""}
        banner_sub_heading={data.stepOne?.event_banner_sub_heading || ""}
        image={data.stepOne?.event_banner_image || null}
        video={data.stepOne?.event_banner_video || null}
      />

      {/* About Event */}
      <AboutEventSec
        about_event_heading={data.stepOne?.about_event_heading || ""}
        about_event_sub_heading={data.stepOne?.about_event_sub_heading || ""}
        about_event_description={data.stepOne?.about_event_description || ""}
      />

      {/* Timeline */}
      <Timeline
        eventSchedular={data.stepOne?.event_schedular || []}
        eventSchedularTitle={data.stepOne?.event_schedular_title || ""}
        eventSchedularBackgroundImage={
          typeof data.stepOne?.event_schedular_background_image === "string"
            ? data.stepOne?.event_schedular_background_image
            : undefined
        }
      />
      {/* Package */}
      <PackageSection
        heading={data.stepTwo?.package_title || ""}
        subHeading={data.stepTwo?.package_description || ""}
        buttonName={data.stepTwo?.package_button_name || ""}
        buttonLink={data.stepTwo?.package_button_name ? "#" : ""}
        image={
          data.stepTwo?.package_image
            ? {
                path: data.stepTwo.package_image,
                relativePath: data.stepTwo.package_image,
                preview: data.stepTwo.package_image,
              }
            : null
        }
        packageDetails={(data.stepTwo?.package_details || []).map((d) => ({
          title: d.title,
          description: d.title,
        }))}
      />

      {/* Dates - derive display price from tickets and/or tables (fixes £0 in preview) */}
      <DatesSection
        dates={
          data.stepThree?.dates?.map((date) => {
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
          }) || []
        }
      />
      {/* Gallery */}
      <EventGallery
        gallery={
          data.stepTwo?.gallery && data.stepTwo.gallery.length > 0
            ? data.stepTwo.gallery.map((image) => {
                if (image instanceof File) {
                  return {
                    path: image.name,
                    relativePath: image.name,
                    preview: URL.createObjectURL(image),
                  };
                }
                // Handle backend gallery items with {id, url} format
                if (
                  typeof image === "object" &&
                  image !== null &&
                  "url" in image
                ) {
                  const galleryItem = image as {
                    id: number;
                    url: string;
                  };
                  return {
                    path: galleryItem.url,
                    relativePath: galleryItem.url,
                    preview: galleryItem.url,
                  };
                }
                return image;
              })
            : Array(8).fill({
                path: "/assets/images/gallery-image.png",
                relativePath: "/assets/images/gallery-image.png",
                preview: "/assets/images/gallery-image.png",
              })
        }
      />
      {/* Menu */}
      <MenuSection
        menus={data.stepFour?.menus || []}
        menu_title={data.stepFour?.menu_title || ""}
        menu_description={data.stepFour?.menu_description || ""}
        catering_option={data.stepFour?.catering_option || 0}
        menu_background_image={data.stepFour?.menu_background_image || null}
      />

      {/* Location & Price (More Info subset) */}
      <BrochureSection
        location={{
          title: data.stepSix?.event_address ? "LOCATION" : "",
          description: data.stepSix?.event_address || "",
          icon: "MapPin",
          latitude: (data as any).stepEight?.latitude,
          longitude: (data as any).stepEight?.longitude,
        }}
        downloads={[
          ...(data.stepSix?.brochure_pdf
            ? [
                {
                  title: "Event Details",
                  download_link: [data.stepSix.brochure_pdf],
                },
              ]
            : []),
          ...(data.stepSix?.faq_pdf
            ? [
                {
                  title: "FAQ Details",
                  download_link: [data.stepSix.faq_pdf],
                },
              ]
            : []),
          ...(data.stepSix?.brochure_pdf_2
            ? [
                {
                  title: "Event Flayer",
                  download_link: [data.stepSix.brochure_pdf_2],
                },
              ]
            : []),
        ]}
        price={{
          title: "",
          description: "",
          link: "",
          icon: "",
          price_title: data.stepSix?.price_start_from || "",
        }}
      />

      {/* Other Packages */}
      <DrinkSection
        title={data.stepFive?.drink_title || ""}
        description={data.stepFive?.drink_description || ""}
        packages={(data.stepFive?.packages || []).map((p) => ({
          title: p.title,
          description: p.description,
          price: Number(p.price),
        }))}
      />

      {/* FAQs */}
      <FaqSection faqs={data.stepSeven?.faqs || []} />

      {/* Footer */}
      <FooterSection
        logo={siteEssentials?.logo || data.logo || null}
        details={{
          contact_number: data.stepEight?.contact_number || "",
          email: "",
          address: data.stepSix?.event_address || "",
        }}
        socialLinks={siteEssentials?.socialLinks}
      />
    </div>
  );
}
