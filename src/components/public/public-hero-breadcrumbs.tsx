"use client";

import Link from "next/link";
import type { EventHeroBreadcrumb } from "@/lib/event-hero-meta";
import {
  heroHeadingAlignClass,
  type BannerHeadingAlign,
} from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";

type PublicHeroBreadcrumbsProps = {
  crumbs: EventHeroBreadcrumb[] | null | undefined;
  align: BannerHeadingAlign;
  /** Phone / Mobile preview: always center the trail. */
  centerOnNarrow?: boolean;
};

/**
 * Shared Home / location / event trail for location + event heroes.
 */
export function PublicHeroBreadcrumbs({
  crumbs,
  align,
  centerOnNarrow = false,
}: PublicHeroBreadcrumbsProps) {
  const items = (crumbs ?? []).filter((crumb) => crumb.label.trim());
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "text-xs font-medium tracking-wide text-white/80 sm:text-sm",
        centerOnNarrow
          ? "text-center"
          : heroHeadingAlignClass(align, { fromMd: true }),
      )}
    >
      <ol
        className={cn(
          "flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1",
          !centerOnNarrow && align === "left" && "md:justify-start",
          !centerOnNarrow && align === "center" && "md:justify-center",
          !centerOnNarrow && align === "right" && "md:justify-end",
        )}
      >
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${crumb.label}-${index}`}
              className="inline-flex items-center gap-x-1.5"
            >
              {index > 0 ? (
                <span className="text-white/45" aria-hidden>
                  /
                </span>
              ) : null}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="underline decoration-white/35 underline-offset-2 transition-colors hover:text-white hover:decoration-white"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "text-white" : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
