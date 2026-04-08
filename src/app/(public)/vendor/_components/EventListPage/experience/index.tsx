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
    <section className="relative w-full overflow-hidden bg-transparent py-16">
      {/* Soft primary wash — matches hero “orb” energy / Lovable-style trail */}
      <div
        className="pointer-events-none absolute -left-20 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_14%,transparent)] blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-8 right-[-4rem] h-64 w-64 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] blur-[90px]"
        aria-hidden
      />

      <div className="container relative z-10 mx-auto px-4">
        <div className="grid grid-cols-1 items-start gap-8 p-8 text-[var(--color-text)] md:grid-cols-2 md:gap-12 md:p-10">
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
            <div className="relative mt-1 inline-flex w-fit">
              {/* Layered glow trail behind CTA (Lovable-style pill) */}
              <span
                className="pointer-events-none absolute left-1/2 top-[58%] h-16 w-[min(100vw,22rem)] max-w-[calc(100%+4rem)] -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-[color:var(--color-primary)] opacity-[0.22] blur-[32px]"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute left-[55%] top-[72%] h-12 w-40 -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-[color:var(--color-primary)] opacity-[0.18] blur-[26px]"
                aria-hidden
              />
              <Link
                href={experienceData.buttonLink}
                className="relative z-[1] inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-3.5 text-sm font-bold tracking-wide text-[var(--color-primary-foreground,white)] shadow-[0_12px_44px_-10px_color-mix(in_srgb,var(--color-primary)_58%,transparent)] transition-[filter,box-shadow,transform] duration-300 hover:brightness-[1.05] hover:shadow-[0_16px_52px_-8px_color-mix(in_srgb,var(--color-primary)_68%,transparent)] active:scale-[0.98]"
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
