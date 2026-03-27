"use client";

import { SiteEssentialsFormValues } from "../_lib/schema";
// // ThemeSchema import removed - no longer needed

import CommonHeader from "@/components/shared/common-header";
import HeroBanner from "@/app/(public)/vendor/_components/EventListPage/hero-banner";
import PopularEvents from "@/app/(public)/vendor/_components/EventListPage/popular-event";
import ExperienceSection from "@/app/(public)/vendor/_components/EventListPage/experience";
import RecentEventsGlimpse from "@/app/(public)/vendor/_components/EventListPage/recent-event";
import ContactFormSection from "@/app/(public)/vendor/_components/EventListPage/contact-form-section";
import UpcomingEvents from "@/app/(public)/vendor/_components/EventListPage/upcoming-event";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import { pickReadableForeground } from "@/lib/color-contrast";
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
    value: string | File | null | undefined
  ): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value;
    if (value instanceof File) return URL.createObjectURL(value);
    return undefined;
  };

  // ServerContext already provided at layout level - no need to create context value

  return (
    <div
      style={previewStyles}
      className={`${
        formValues.colors?.background?.includes("linear-gradient")
          ? "bg-none"
          : "bg-[color:var(--color-background)]"
      } text-[color:var(--color-text)] font-[var(--font-body)]`}
      {...(formValues.colors?.background?.includes("linear-gradient") && {
        style: {
          ...previewStyles,
          background: formValues.colors.background,
        },
      })}
    >
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
      />
      <ExperienceSection
        aboutTitle={formValues.about_title || null}
        aboutDescription={formValues.about_description || null}
        aboutLinkTitle={formValues.about_link_title || null}
        aboutCtaLink={formValues.about_cta_link || null}
      />
      <PopularEvents
        events={[]}
        sectionTitle={formValues.event_title_1 || "Popular Events"}
        locationSlug=""
      />
      <UpcomingEvents
        events={[]}
        sectionTitle={formValues.event_title_2 || "Upcoming Events"}
        locationSlug=""
      />
      <RecentEventsGlimpse
        galleryImages={[]}
        galleryTitle={formValues.event_gallery_title || "Recent Events Glimpse"}
      />
      <ContactFormSection
        locationAddress={formValues.name || ""}
        longitude={0}
        latitude={0}
      />
      <FooterSection
        copyright={formValues.copyright}
        logo={getPreviewUrl(formValues.logo) || null}
      />
    </div>
  );
}
