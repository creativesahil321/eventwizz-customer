"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocationStore } from "@/store/location.store";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import LocationSelectionHeader from "./_components/LocationPage/location-selection-header";
import LocationGrid from "./_components/LocationPage/location-grid";
import GoogleLocationMap from "./_components/LocationPage/location-map-google";
import Image from "next/image";
import { motion } from "framer-motion";
import SubscribeSection from "./_components/EventListPage/subscribe";
import { CheckCircle2, Map, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VendorSiteHomePage() {
  const router = useRouter();
  const { allLocations } = useLocationStore();
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "grid">("grid");
  const [isMobile, setIsMobile] = useState(false);
  const { settings, isLoading: isDomainLoading } = useDomain();

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Force grid view on mobile
      if (window.innerWidth < 768) {
        setViewMode("grid");
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load locations from theme settings once domain data is loaded
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

  // Function to handle location selection
  const handleLocationSelect = (slug: string) => {
    router.push(`/${slug}`);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      {/* Background image with subtle overlay */}
      <div className="absolute inset-0 opacity-30">
        <Image
          src="/assets/images/Homepage/Homepage-Banner.png"
          alt="Event background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/80 to-white/95" />
      </div>

      <LocationSelectionHeader
        name={settings?.name || "EventWizz"}
        logo={settings?.logo}
      />

      <motion.main
        className="flex-1 container mx-auto px-4 py-16 z-10 relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Hero section with professional styling */}
        <div className="text-center mb-16 max-w-4xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Find Events Near You
            </h1>

            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              Discover verified venues and curated events in your area. Browse
              by location to find the perfect experience.
            </p>

            {/* Trust indicators */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm text-gray-700"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                <span className="font-medium">Verified Venues</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                <span className="font-medium">Secure Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                <span className="font-medium">1,200+ Happy Customers</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* View toggle - hidden on mobile */}
        {!isMobile && (
          <motion.div
            className="flex justify-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <div className="inline-flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-2 ${
                  viewMode === "map"
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Map size={16} />
                Map View
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-2 ${
                  viewMode === "grid"
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Grid3x3 size={16} />
                Grid View
              </Button>
            </div>
          </motion.div>
        )}

        {/* Location visualization */}
        <motion.div
          className="w-full px-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {viewMode === "map" && !isMobile ? (
            <GoogleLocationMap
              locations={allLocations}
              onSelect={handleLocationSelect}
            />
          ) : (
            <div className="max-w-6xl mx-auto">
              <LocationGrid
                locations={allLocations}
                isLoading={isLoading || isDomainLoading}
                onSelect={handleLocationSelect}
              />
            </div>
          )}
        </motion.div>
      </motion.main>

      <SubscribeSection />

      <motion.footer
        className="relative z-10 bg-white/80 backdrop-blur-sm text-gray-700 py-8 border-t border-gray-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              {settings?.copyright || "© 2023 EventWizz. All rights reserved."}
            </p>

            <div className="flex gap-6 text-sm">
              {["Privacy Policy", "Terms of Service", "Contact"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
