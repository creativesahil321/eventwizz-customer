"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/use-onboarding";
import LocationMap from "./location-map";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

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
};

export default function BrochureSection({
  location,
  downloads = [],
  price,
}: BrochureSectionProps) {
  const { textColorClass } = useOnboarding();
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
    <section className="p-5 text-center">
      <section className="w-full mb-5">
        <h2
          className={`text-xl sm:text-2xl md:text-3xl font-bold max-w-4xl mx-auto pb-5 px-2 ${textColorClass}`}
        >
          Check Out The Latest Dates To Be Released
          <br className="hidden sm:inline" /> But Get In Quick As These Dates
          Will Soon Go
        </h2>
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-5 px-2 sm:px-5">
        <section className="w-full rounded-md overflow-hidden">
          <LocationMap
            address={defaultLocation.description}
            latitude={location.latitude}
            longitude={location.longitude}
            className="w-full h-full"
          />
        </section>

        <section className="w-full bg-[var(--color-surface)] text-[var(--color-text)] flex flex-col justify-center items-center py-5 px-2 rounded-md">
          {renderIcon("Download", 24)}
          <h2 className="text-base sm:text-lg font-bold py-2 sm:py-3 uppercase">
            DOWNLOADS
          </h2>
          {validDownloads.length > 0 ? (
            validDownloads.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1 mb-1">
                {renderIcon("FileText", 16)}
                <Link
                  href={item.download_link[0]}
                  className="text-[var(--color-text)] text-xs sm:text-sm underline break-all"
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
            <p className="text-xs sm:text-sm text-[var(--color-text-dimmed)]">
              No downloads available
            </p>
          )}
        </section>

        <section className="w-full bg-[var(--color-surface)]  text-[var(--color-text)] flex flex-col justify-center items-center py-5 px-2 rounded-md sm:col-span-2 md:col-span-1">
          {renderIcon(defaultPrice.icon, 24)}
          <h2 className="text-base sm:text-lg font-bold py-2 sm:py-3 uppercase break-words max-w-full px-2">
            {defaultPrice.title}
          </h2>
          <p
            className="text-xs sm:text-sm break-words whitespace-normal overflow-hidden max-w-full px-2"
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
      </section>
    </section>
  );
}
