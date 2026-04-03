"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import LocationSelectionHeader from "./_components/LocationPage/location-selection-header";
import LocationGrid from "./_components/LocationPage/location-grid";
import GoogleLocationMap from "./_components/LocationPage/location-map-google";
import Image from "next/image";
import { motion } from "framer-motion";
import SubscribeSection from "./_components/EventListPage/subscribe";
import { CheckCircle2, Map, LayoutGrid } from "lucide-react";
import { SiteHeading } from "@/components/public/site-heading";

export default function VendorSiteHomePage() {
  const router = useRouter();
  const { settings, isLoading: isDomainLoading } = useDomain();
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "grid">("grid");
  const [isMobile, setIsMobile] = useState(false);

  const allLocations = useMemo(
    () => settings?.locations || [],
    [settings?.locations],
  );

  const heroImageSrc = useMemo(() => {
    const cover = settings?.cover_image;
    if (typeof cover === "string" && cover.trim().length > 0) {
      return cover.trim();
    }
    return "/assets/images/Homepage/Homepage-Banner.png";
  }, [settings?.cover_image]);

  const heroHeading =
    typeof settings?.banner_heading === "string" &&
    settings.banner_heading.trim().length > 0
      ? settings.banner_heading.trim()
      : "Find Events Near You";

  const heroAccentHint =
    typeof settings?.banner_heading_accent === "string" &&
    settings.banner_heading_accent.trim().length > 0
      ? settings.banner_heading_accent.trim()
      : null;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setViewMode("grid");
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isDomainLoading) {
      return;
    }

    if (allLocations && allLocations.length > 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  }, [allLocations, isDomainLoading]);

  const handleLocationSelect = (slug: string) => {
    router.push(`/${slug}`);
  };

  const trustItems = [
    "Verified Venues",
    "Secure Bookings",
    "1,200+ Happy Customers",
  ] as const;

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--color-background)] font-body text-[var(--color-text)]">
      <LocationSelectionHeader
        name={settings?.name || "EventWizz"}
        logo={settings?.logo}
      />

      {/* Hero — contained height, tenant cover or default banner */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
        <Image
          src={heroImageSrc}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="100vw"
          unoptimized={/^https?:\/\//i.test(heroImageSrc)}
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/80"
          aria-hidden
        />
        <div className="relative z-10 w-full px-6 text-center">
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl"
          >
            <SiteHeading
              level={1}
              title={heroHeading}
              accentHint={heroAccentHint}
              variant="onDark"
              className="mb-6"
            />

            <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
              Discover verified venues and curated events in your area. Browse
              by location to find the perfect experience.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/80 md:gap-8">
              {trustItems.map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[color:var(--color-primary)] md:h-[18px] md:w-[18px]"
                    aria-hidden
                  />
                  <span className="font-medium text-white/95">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {!isMobile && (
        <section className="flex justify-center bg-[var(--color-background)] py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="rounded-full border border-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] bg-[var(--color-surface)] p-1 shadow-sm"
          >
            <div className="flex">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  viewMode === "map"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                    : "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]"
                }`}
              >
                <Map className="h-4 w-4" aria-hidden />
                Map View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  viewMode === "grid"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                    : "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]"
                }`}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
                Grid View
              </button>
            </div>
          </motion.div>
        </section>
      )}

      <section className="bg-[var(--color-background)] pb-16 md:pb-20">
        <motion.div
          className="container mx-auto px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
        >
          {viewMode === "map" && !isMobile ? (
            <GoogleLocationMap
              locations={allLocations}
              onSelect={handleLocationSelect}
            />
          ) : (
            <div className="mx-auto max-w-6xl">
              <LocationGrid
                locations={allLocations}
                isLoading={isLoading || isDomainLoading}
                onSelect={handleLocationSelect}
              />
            </div>
          )}
        </motion.div>
      </section>

      <SubscribeSection />

      <motion.footer
        className="relative z-10 border-t border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-footer)] py-8 text-[var(--color-on-footer)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <p className="text-sm opacity-90">
            {settings?.copyright || "© 2023 EventWizz. All rights reserved."}
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-sm">
            {["Privacy Policy", "Terms of Service", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="opacity-85 transition-opacity hover:opacity-100"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
