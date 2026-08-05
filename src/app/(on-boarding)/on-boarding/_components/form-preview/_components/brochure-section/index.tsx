"use client";

import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import LocationMap from "./location-map";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { cn } from "@/lib/utils";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { SiteHeading } from "@/components/public/site-heading";

type LucideIconName = keyof typeof Icons;

interface LocationData {
  title: string;
  icon?: string;
  description: string;
  location_direction?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

/** Kept for callers that still build header download rows from the same shape. */
export interface DownloadItem {
  icon?: string;
  title: string;
  download_link: string[];
}

export interface PriceProps {
  icon?: string;
  title?: string;
  description?: string;
  link?: string;
  price_title?: string;
}

type BrochureSectionProps = {
  location: LocationData;
  price: PriceProps;
  /** When true, the location map mounts and loads immediately (public event pages). */
  showMapImmediately?: boolean;
  /** Hide the price tile (e.g. when prices are shown in About on the public event page). */
  omitPricePanel?: boolean;
};

export default function BrochureSection({
  location,
  price,
  showMapImmediately = false,
  omitPricePanel = false,
}: BrochureSectionProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const narrowPreview = usePreviewNarrowLayout();

  const sanitizeHref = (raw: unknown): string | null => {
    if (typeof raw !== "string") return null;
    const value = raw.trim();
    if (!value || value === "#") return null;
    if (
      value.startsWith("blob:") ||
      value.startsWith("/") ||
      value.startsWith("#")
    ) {
      return value;
    }
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return value;
      }
      return null;
    } catch {
      // Keep relative paths valid for local/public assets.
      if (value.startsWith("./") || value.startsWith("../")) return value;
      return null;
    }
  };

  const renderIcon = (iconName?: string, size = 24) => {
    if (!iconName) return null;
    const LucideIcon = Icons[iconName as LucideIconName] as React.ElementType;
    if (!LucideIcon) return null;
    return <LucideIcon size={size} />;
  };

  const defaultLocation = {
    title: location?.title || "LOCATION",
    description:
      location?.description ||
      "Enter your venue address in the form to display here",
    icon: location?.icon || "MapPin",
    latitude: location?.latitude || null,
    longitude: location?.longitude || null,
  };

  const defaultPrice = {
    title: price?.title || "PRICES FROM",
    description: price?.description || `${formatMoney(45)} PP exc VAT`,
    link: price?.link || "#",
    price_title: price?.price_title || "",
    icon: price?.icon || "Tag",
  };

  const gridClass = cn(
    "grid grid-cols-1 gap-4",
    // Mobile / framed Mobile-Tablet: stack like live phone (map → price).
    // Desktop preview + live desktop: side-by-side when price is shown.
    !narrowPreview && !omitPricePanel && "sm:grid-cols-2",
  );

  return (
    <section className="py-16 px-4 bg-[color:var(--color-background)]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Location
          </p>
          <SiteHeading
            level={2}
            title="Check Out The Latest Dates To Be Released — Get In Quick!"
            variant="onSurface"
            align="center"
            className="mx-auto !max-w-4xl !text-3xl !font-black tracking-tight md:!text-4xl"
          />
        </div>
        <section className={gridClass}>
          <section className="w-full overflow-hidden rounded-md">
            <LocationMap
              address={defaultLocation.description}
              latitude={location.latitude}
              longitude={location.longitude}
              className="h-full w-full"
              showMapImmediately={showMapImmediately}
            />
          </section>

          {!omitPricePanel ? (
            <section className="flex w-full flex-col items-center justify-center rounded-md bg-[var(--color-primary)] px-2 py-5 text-[var(--color-primary-foreground)]">
              {renderIcon(defaultPrice.icon, 24)}
              <h2
                className={cn(
                  "max-w-full break-words px-2 py-2 text-base font-bold uppercase",
                  !narrowPreview && "sm:py-3 sm:text-lg",
                )}
              >
                {defaultPrice.title}
              </h2>
              <p
                className={cn(
                  "max-w-full overflow-hidden px-2 text-xs break-words whitespace-normal",
                  !narrowPreview && "sm:text-sm",
                )}
                style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
              >
                {defaultPrice.description}
              </p>
              {defaultPrice.price_title ? (
                <Button
                  variant="event-outline"
                  type="button"
                  className="mt-3"
                  asChild
                >
                  {defaultPrice.link?.startsWith("#") ? (
                    <button
                      type="button"
                      onClick={() => {
                        const id = defaultPrice.link!.slice(1);
                        const el = id ? document.getElementById(id) : null;
                        el?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                    >
                      {defaultPrice.price_title}
                    </button>
                  ) : (
                    <a
                      href={sanitizeHref(defaultPrice.link) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!sanitizeHref(defaultPrice.link)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {defaultPrice.price_title}
                    </a>
                  )}
                </Button>
              ) : null}
            </section>
          ) : null}
        </section>
      </div>
    </section>
  );
}
