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
          ? "py-16"
          : "py-16 md:py-28 @max-5xl/preview:!py-16",
      )}
    >
      <div className="mx-auto min-w-0 max-w-7xl">
        <div
          className={cn(
            "grid grid-cols-1 items-start gap-8 text-[var(--color-text)]",
            !narrowPreview &&
              "lg:grid-cols-2 lg:gap-16 @max-5xl/preview:!grid-cols-1 @max-5xl/preview:!gap-8",
          )}
        >
          <div className="w-full min-w-0">
            <SiteHeading
              level={2}
              title={titleText}
              variant="onSurface"
              className={cn(
                "!mt-2 !leading-tight break-words !text-3xl !font-black tracking-tight",
                !narrowPreview &&
                  "lg:!text-5xl @max-5xl/preview:!text-3xl",
              )}
            />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-6">
            <div
              className={cn(
                "break-words text-base text-[var(--color-text-dimmed)]",
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
