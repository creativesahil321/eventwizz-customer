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
    <section className="w-full bg-[color:var(--color-background)] py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 items-start gap-8 text-[var(--color-text)] md:grid-cols-2 md:gap-16">
          <div className="w-full">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--color-primary)]">
              About the venue
            </p>
            <h2
              className="text-3xl font-black leading-tight tracking-tight md:text-5xl"
              dangerouslySetInnerHTML={{ __html: experienceData.title }}
            />
          </div>
          <div className="flex w-full flex-col gap-6">
            <p
              className="text-base md:text-lg text-[var(--color-text-dimmed)]"
              dangerouslySetInnerHTML={{ __html: experienceData.description }}
            />
            <div className="inline-flex w-fit">
              <Link
                href={experienceData.buttonLink}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-3.5 text-sm font-bold tracking-wide text-[var(--color-primary-foreground,white)] shadow-md transition-[filter,box-shadow,transform] duration-300 hover:brightness-105 active:scale-[0.98]"
              >
                {experienceData.buttonText}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
