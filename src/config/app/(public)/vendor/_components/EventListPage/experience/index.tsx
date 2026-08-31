"use client";

import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { cn } from "@/lib/utils";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { SiteHeading } from "@/components/public/site-heading";

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
  const narrowPreview = usePreviewNarrowLayout();

  const venueName = vendorTheme?.name || "EventWizz";

  const titleText = (
    aboutTitle ||
    vendorTheme?.about_title ||
    `Experience more ${venueName} Events`
  ).replace(/<br\s*\/?>/gi, " ");

  const descriptionHtml =
    aboutDescription ||
    vendorTheme?.about_description ||
    `${venueName} has a varied and lively social events calendar. Our professionally produced events include sell-out Lipstick, Powder & Paint Nights, (perfect fun-packed evenings for the last night of freedom), fantastic bottomless brunches in addition to traditional annual dining events such as Mothers & Fathers Day, Christmas & New Year's Eve.`;

  return (
    <section
      className={cn(
        "w-full scroll-mt-28 bg-[color:var(--color-background)] px-4",
        narrowPreview
          ? "py-10 sm:py-12"
          : "py-12 md:py-20 @max-5xl/preview:!py-12",
      )}
    >
      <div className="mx-auto min-w-0 max-w-7xl">
        <div
          className={cn(
            "grid grid-cols-1 items-start gap-8 text-[var(--color-text)] md:gap-10",
            !narrowPreview &&
              "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 @max-5xl/preview:!grid-cols-1 @max-5xl/preview:!gap-8",
          )}
        >
          <div className="relative w-full min-w-0 lg:pr-8">
            <div
              className="mb-5 h-1 w-12 rounded-full bg-[var(--color-primary)] sm:mb-6"
              aria-hidden="true"
            />
            <SiteHeading
              level={2}
              title={titleText}
              variant="onSurface"
              className={cn(
                "!mt-0 !leading-[1.08] break-words !text-3xl !font-black tracking-tight sm:!text-4xl",
                !narrowPreview &&
                  "lg:!text-5xl @max-5xl/preview:!text-3xl",
              )}
            />
          </div>
          <div className="flex w-full min-w-0 flex-col lg:border-l lg:border-[color:color-mix(in_srgb,var(--color-primary)_22%,transparent)] lg:pl-10">
            <div
              className={cn(
                "max-w-[60ch] break-words text-base leading-8 text-[var(--color-text-dimmed)] [&_p+p]:mt-4",
                !narrowPreview && "lg:text-lg @max-5xl/preview:!text-base",
              )}
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
