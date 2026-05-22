"use client";

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
    price_title: price?.price_title || "",
    icon: price?.icon || "Tag",
  };

  // Filter out downloads with invalid links
  const validDownloads = downloads.filter((item) => {
    if (!item.download_link || item.download_link.length === 0) return false;
    const title = (item.title || "").toLowerCase();
    if (title.includes("faq") || title.includes("frequently asked")) {
      return false;
    }
    return true;
  });
  const showDownloads = validDownloads.length > 0;

  const gridClass = cn(
    "grid grid-cols-1 gap-4",
    omitPricePanel
      ? showDownloads
        ? "sm:grid-cols-2"
        : ""
      : showDownloads
        ? "sm:grid-cols-2 md:grid-cols-3"
        : "sm:grid-cols-2",
  );

  const pricePanelClass = cn(
    "flex w-full flex-col items-center justify-center rounded-md bg-[var(--color-surface)] px-2 py-5 text-[var(--color-text)]",
    showDownloads && !omitPricePanel && "sm:col-span-2 md:col-span-1",
  );

  return (
    <section className="py-16 px-4 bg-[color:var(--color-background)]">
      <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl max-w-4xl mx-auto">
          Check Out The Latest Dates To Be Released — Get In Quick!
        </h2>
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

        {showDownloads ? (
          <section className="flex w-full flex-col items-center justify-center rounded-md bg-[var(--color-surface)] px-2 py-5 text-[var(--color-text)]">
            {renderIcon("Download", 24)}
            <h2 className="py-2 text-base font-bold uppercase sm:py-3 sm:text-lg">
              DOWNLOADS
            </h2>
            {validDownloads.map((item, idx) => (
              <div key={idx} className="mb-1 flex items-center gap-1">
                {renderIcon("FileText", 16)}
                <a
                  href={sanitizeHref(item.download_link[0]) ?? "#"}
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
                    } else if (!sanitizeHref(item.download_link[0])) {
                      e.preventDefault();
                    }
                  }}
                >
                  {item.title}
                </a>
              </div>
            ))}
          </section>
        ) : null}

        {!omitPricePanel ? (
          <section className={pricePanelClass}>
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
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
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
