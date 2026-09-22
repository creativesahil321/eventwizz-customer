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
import { PUBLIC_SECTION_CONTAINER_CLASS } from "@/lib/public-rhythm";

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
    `<p>${venueName} hosts a calendar of social events. Check upcoming dates below, or get in touch to find out more.</p>`;

  return (
    <section
      className={cn(
        "w-full scroll-mt-28 bg-[color:var(--color-background)]",
        phoneFrame ? "py-12" : "py-12 md:py-16",
      )}
    >
      <div
        className={cn(
          PUBLIC_SECTION_CONTAINER_CLASS,
          "text-[var(--color-text)]",
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
        <div
          className={cn(
            "mt-5 w-full min-w-0 break-words text-base leading-8 text-[var(--color-text-dimmed)] [&_p]:my-0 [&_p+p]:mt-4",
            phoneFrame ? "mt-4" : "sm:mt-6",
            !framedBelowLg && "lg:text-lg",
          )}
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      </div>
    </section>
  );
}
