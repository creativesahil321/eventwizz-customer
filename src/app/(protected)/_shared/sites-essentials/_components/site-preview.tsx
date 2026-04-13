"use client";

import { SiteEssentialsFormValues } from "../_lib/schema";
// // ThemeSchema import removed - no longer needed

import CommonHeader from "@/components/shared/common-header";
import HeroBanner from "@/app/(public)/vendor/_components/EventListPage/hero-banner";
import ExperienceSection from "@/app/(public)/vendor/_components/EventListPage/experience";
import ContactFormSection from "@/app/(public)/vendor/_components/EventListPage/contact-form-section";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import { LocationMarketingBody } from "@/components/public/location-marketing-sections";
import { pickReadableForeground } from "@/lib/color-contrast";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
// ServerContext removed - already provided at layout level

interface SitePreviewProps {
  formValues: SiteEssentialsFormValues;
}

export function SitePreview({ formValues }: Readonly<SitePreviewProps>) {
  const primary = formValues.colors?.primary || "#0F172A";
  const secondary = formValues.colors?.secondary || "#64748B";
  const header = formValues.colors?.header || "#FFFFFF";
  const footer = formValues.colors?.footer || "#0F172A";
  const background = formValues.colors?.background || "#F8FAFC";
  const surface = formValues.colors?.surface || "#FFFFFF";
  const text = formValues.colors?.text || "#0F172A";
  const textDimmed = formValues.colors?.textDimmed || "#64748B";

  // Apply the site theme to the preview content
  const previewStyles = {
    "--color-primary": primary,
    "--color-secondary": secondary,
    "--color-header": header,
    "--color-footer": footer,
    "--color-background": background,
    "--color-text": text,
    "--color-text-dimmed": textDimmed,
    "--color-surface": surface,
    "--color-primary-foreground": pickReadableForeground(primary),
    "--color-secondary-foreground": pickReadableForeground(secondary),
    "--color-on-header": pickReadableForeground(header),
    "--color-on-footer": pickReadableForeground(footer),
    "--color-on-surface": pickReadableForeground(surface),
    "--color-on-background": pickReadableForeground(background),
    "--font-heading":
      formValues.typography?.fontFamily?.heading || "'Inter', sans-serif",
    "--font-body":
      formValues.typography?.fontFamily?.body || "'Inter', sans-serif",
  } as React.CSSProperties;

  // Helper function to convert File objects to blob URLs for preview
  const getPreviewUrl = (
    value: string | File | null | undefined,
  ): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value;
    if (value instanceof File) return URL.createObjectURL(value);
    return undefined;
  };

  // ServerContext already provided at layout level - no need to create context value

  const useGradientBg =
    formValues.colors?.background?.includes("linear-gradient");

  const mainBandStyle = useGradientBg
    ? ({
        ...previewStyles,
        background: formValues.colors?.background,
      } as React.CSSProperties)
    : previewStyles;

  const mainBandClass = useGradientBg
    ? "bg-none text-[color:var(--color-text)] font-body"
    : "bg-[color:var(--color-background)] text-[color:var(--color-text)] font-body";

  return (
    <div
      style={{
        ...previewStyles,
        // Must set font-family here (not only --font-body): descendants inherit
        // computed font from this subtree. Otherwise plain <p> text walks up past
        // this div and uses <body>'s global theme font while SiteHeading still
        // updates via inline var(--font-heading).
        fontFamily: "var(--font-body)",
      }}
      className="text-[color:var(--color-text)] font-body"
    >
      <SiteEssentialsGoogleFontsLoader
        linkId="site-essentials-google-fonts-site-preview"
        headingStack={formValues.typography?.fontFamily?.heading}
        bodyStack={formValues.typography?.fontFamily?.body}
        customStylesheetUrls={formValues.typography?.customFontStylesheetUrls}
      />
      {/* ServerContext already provided at layout level - no need to wrap again */}
      <CommonHeader
        logo={getPreviewUrl(formValues.logo) || null}
        contact_number={""}
        variant="preview"
      />
      <HeroBanner
        locationName={formValues.name}
        coverImage={getPreviewUrl(formValues.cover_image) || null}
        coverVideo={getPreviewUrl(formValues.cover_video) || null}
        bannerHeading={formValues.banner_heading}
        bannerSubHeading={formValues.banner_sub_heading}
        bannerHeadingAccent={formValues.banner_heading_accent}
        headingEmphasis={formValues.typography?.headingEmphasis}
        bannerHeadingAlign={formValues.banner_heading_align}
        bannerHeadingValign={formValues.banner_heading_valign}
      />
      <LocationMarketingBody
        className={mainBandClass}
        style={mainBandStyle}
        experience={
          <ExperienceSection
            aboutTitle={formValues.about_title || null}
            aboutDescription={formValues.about_description || null}
            aboutLinkTitle={formValues.about_link_title || null}
            aboutCtaLink={formValues.about_cta_link || null}
          />
        }
        latestEvents={[]}
        upcomingEvents={[]}
        popularSectionTitle={formValues.event_title_1 || "Popular Events"}
        upcomingSectionTitle={formValues.event_title_2 || "Upcoming Events"}
        galleryTitle={
          formValues.event_gallery_title || "Recent Events Glimpse"
        }
        galleryImages={[]}
        locationSlug=""
        locationLabel={null}
      />
      <ContactFormSection />
      <FooterSection
        copyright={formValues.copyright}
        logo={getPreviewUrl(formValues.logo) || null}
      />
    </div>
  );
}
