"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";

interface ExperienceSectionProps {
  aboutTitle?: string | null;
  aboutDescription?: string | null;
  aboutLinkTitle?: string | null;
  aboutCtaLink?: string | null;
}

export default function ExperienceSection({
  aboutTitle,
  aboutDescription,
  aboutLinkTitle,
  aboutCtaLink,
}: ExperienceSectionProps) {
  const { theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema;

  const venueName = vendorTheme?.name || "EventWizz";

  const experienceData = {
    title:
      aboutTitle ||
      vendorTheme?.about_title ||
      `Experience more<br>${venueName} Events`,
    description:
      aboutDescription ||
      vendorTheme?.about_description ||
      `${venueName} has a varied and lively social events calendar. Our professionally produced events include sell-out Lipstick, Powder & Paint Nights, (perfect fun-packed evenings for the last night of freedom), fantastic bottomless brunches in addition to traditional annual dining events such as Mothers & Fathers Day, Christmas & New Year's Eve.`,
    buttonText:
      aboutLinkTitle || vendorTheme?.about_link_title || "View all our events",
    buttonLink: aboutCtaLink || vendorTheme?.about_cta_link || "/vendor/events",
  };

  return (
    <section className="w-full py-16 bg-[var(--color-background)]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start rounded-2xl bg-[var(--color-surface)] text-[var(--color-on-surface)] border border-[var(--color-on-surface)]/10 p-8 md:p-10 shadow-sm">
          <div className="w-full">
            <h2
              className="text-3xl md:text-5xl font-bold leading-tight"
              dangerouslySetInnerHTML={{ __html: experienceData.title }}
            />
          </div>
          <div className="w-full flex flex-col gap-6">
            <p
              className="text-base md:text-lg text-[var(--color-on-surface)]/85"
              dangerouslySetInnerHTML={{ __html: experienceData.description }}
            />
            <Link
              href={experienceData.buttonLink}
              className="inline-flex items-center font-medium border-b border-[var(--color-on-surface)]/50 pb-1 hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)] transition-colors w-fit"
            >
              {experienceData.buttonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
