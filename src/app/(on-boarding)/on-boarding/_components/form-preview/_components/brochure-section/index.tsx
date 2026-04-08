"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import LocationMap from "./location-map";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { cn } from "@/lib/utils";

type LucideIconName = keyof typeof Icons;

interface LocationData {
  title: string;
  icon?: string;
  description: string;
  location_direction?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

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
  downloads?: DownloadItem[];
  price: PriceProps;
  /** When true, the location map mounts and loads immediately (public event pages). */
  showMapImmediately?: boolean;
  /** Hide the price tile (e.g. when prices are shown in About on the public event page). */
  omitPricePanel?: boolean;
};

export default function BrochureSection({
  location,
  downloads = [],
  price,
  showMapImmediately = false,
  omitPricePanel = false,
}: BrochureSectionProps) {
  const { format: formatMoney } = useCurrencyFormat();

  const renderIcon = (iconName?: string, size = 24) => {
    if (!iconName) return null;
    const LucideIcon = Icons[iconName as LucideIconName] as React.ElementType;
    if (!LucideIcon) return null;
    return <LucideIcon size={size} />;
  };

  // Create default location and price objects
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
    price_title: price?.price_title || "Book Now",
    icon: price?.icon || "Tag",
  };

  // Filter out downloads with invalid links
  const validDownloads = downloads.filter(
    (item) => item.download_link && item.download_link.length > 0,
  );

  return (
    <section className="p-5 text-center bg-[color:var(--color-background)]">
      <section className="w-full mb-5">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold max-w-4xl mx-auto pb-5 px-2 text-[var(--color-text)]">
          Check Out The Latest Dates To Be Released
          <br className="hidden sm:inline" /> But Get In Quick As These Dates
          Will Soon Go
        </h2>
      </section>
      <section
        className={cn(
          "my-5 grid grid-cols-1 gap-4 px-2 sm:px-5",
          omitPricePanel
            ? "sm:grid-cols-2"
            : "sm:grid-cols-2 md:grid-cols-3",
        )}
      >
        <section className="w-full overflow-hidden rounded-md">
          <LocationMap
            address={defaultLocation.description}
            latitude={location.latitude}
            longitude={location.longitude}
            className="h-full w-full"
            showMapImmediately={showMapImmediately}
          />
        </section>

        <section className="flex w-full flex-col items-center justify-center rounded-md bg-[var(--color-surface)] px-2 py-5 text-[var(--color-text)]">
          {renderIcon("Download", 24)}
          <h2 className="py-2 text-base font-bold uppercase sm:py-3 sm:text-lg">
            DOWNLOADS
          </h2>
          {validDownloads.length > 0 ? (
            validDownloads.map((item, idx) => (
              <div key={idx} className="mb-1 flex items-center gap-1">
                {renderIcon("FileText", 16)}
                <Link
                  href={item.download_link[0]}
                  className="break-all text-xs text-[var(--color-text)] underline sm:text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    // For File objects, we need to handle download differently
                    if (item.download_link[0].startsWith("blob:")) {
                      e.preventDefault();
                      const link = document.createElement("a");
                      link.href = item.download_link[0];
                      link.download = item.title + ".pdf";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                >
                  {item.title}
                </Link>
              </div>
            ))
          ) : (
            <p className="text-xs text-[var(--color-text-dimmed)] sm:text-sm">
              No downloads available
            </p>
          )}
        </section>

        {!omitPricePanel ? (
          <section className="flex w-full flex-col items-center justify-center rounded-md bg-[var(--color-surface)] px-2 py-5 text-[var(--color-text)] sm:col-span-2 md:col-span-1">
            {renderIcon(defaultPrice.icon, 24)}
            <h2 className="max-w-full break-words px-2 py-2 text-base font-bold uppercase sm:py-3 sm:text-lg">
              {defaultPrice.title}
            </h2>
            <p
              className="max-w-full overflow-hidden px-2 text-xs break-words whitespace-normal sm:text-sm"
              style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            >
              {defaultPrice.description}
            </p>
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
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {defaultPrice.price_title}
                </button>
              ) : (
                <Link href={defaultPrice.link}>{defaultPrice.price_title}</Link>
              )}
            </Button>
          </section>
        ) : null}
      </section>
    </section>
  );
}
