"use client";

import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";

interface ExperienceSectionProps {
  aboutTitle?: string | null;
  aboutDescription?: string | null;
}

export default function ExperienceSection({
  aboutTitle,
  aboutDescription,
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
  };

  return (
    <section className="w-full bg-[color:var(--color-background)] py-20 px-4 md:py-28">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 items-start gap-8 text-[var(--color-text)] md:grid-cols-2 md:gap-16">
          <div className="w-full">
            <h2
              className="mt-2 text-3xl font-black leading-tight tracking-tight md:text-5xl"
              dangerouslySetInnerHTML={{ __html: experienceData.title }}
            />
          </div>
          <div className="flex w-full flex-col gap-6">
            <p
              className="text-base md:text-lg text-[var(--color-text-dimmed)]"
              dangerouslySetInnerHTML={{ __html: experienceData.description }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
