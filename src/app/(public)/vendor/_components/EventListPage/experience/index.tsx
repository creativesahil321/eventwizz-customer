"use client";

import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { cn } from "@/lib/utils";
import {
  usePreviewMobileLayout,
  usePreviewNarrowLayout,
} from "@/hooks/use-preview-narrow-layout";
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
  const framedBelowLg = usePreviewNarrowLayout();
  const phoneFrame = usePreviewMobileLayout();

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
        phoneFrame ? "py-12" : "py-12 md:px-6 md:py-16",
      )}
    >
      <div className="mx-auto min-w-0 max-w-7xl">
        <div
          className={cn(
            "grid grid-cols-1 items-start gap-8 text-[var(--color-text)]",
            !phoneFrame && "md:gap-10",
            !framedBelowLg &&
              "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16",
          )}
        >
          <div
            className={cn(
              "relative w-full min-w-0",
              !framedBelowLg && "lg:pr-8",
            )}
          >
            <div
              className={cn(
                "h-1 w-12 rounded-full bg-[var(--color-primary)]",
                phoneFrame ? "mb-5" : "mb-5 sm:mb-6",
              )}
              aria-hidden="true"
            />
            <SiteHeading
              level={2}
              title={titleText}
              variant="onSurface"
              className={cn(
                "!mt-0 !leading-[1.08] break-words !text-3xl !font-black tracking-tight",
                !phoneFrame && "sm:!text-4xl",
                !framedBelowLg && "lg:!text-5xl",
              )}
            />
          </div>
          <div
            className={cn(
              "flex w-full min-w-0 flex-col",
              !framedBelowLg &&
                "lg:border-l lg:border-[color:color-mix(in_srgb,var(--color-primary)_22%,transparent)] lg:pl-10",
            )}
          >
            <div
              className={cn(
                "max-w-[60ch] break-words text-base leading-8 text-[var(--color-text-dimmed)] [&_p]:my-0 [&_p+p]:mt-4",
                !framedBelowLg && "lg:text-lg",
              )}
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
