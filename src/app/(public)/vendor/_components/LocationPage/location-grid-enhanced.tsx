"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  ArrowRight,
  Calendar,
  Sparkles,
  Clock,
  Music,
  Wine,
  PartyPopper,
  Trophy,
  Ticket,
} from "lucide-react";
import { VenueLocation } from "@/types/api.types";
import { LocationData } from "@/types/theme.types";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

// Generic location type to handle both API types
interface LocationGridProps {
  locations: (VenueLocation | LocationData)[];
  isLoading: boolean;
  onSelect: (slug: string) => void;
  locationStats?: Record<
    string,
    {
      eventsCount: number;
      venuesCount: number;
      liveEventsCount: number;
      upcomingEvent?: { date: string; name: string };
      categories?: string[];
      startingPrice?: number;
      isNew?: boolean;
    }
  >;
}

// Event category icon mapping
const categoryIcons: Record<string, React.ReactNode> = {
  music: <Music className="h-3 w-3" />,
  party: <PartyPopper className="h-3 w-3" />,
  sports: <Trophy className="h-3 w-3" />,
  dining: <Wine className="h-3 w-3" />,
  default: <Ticket className="h-3 w-3" />,
};

export default function LocationGridEnhanced({
  locations,
  isLoading,
  onSelect,
  locationStats = {},
}: LocationGridProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Loading skeleton animation
  const skeletonVariants: Variants = {
    pulse: {
      opacity: [0.4, 0.8, 0.4],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  if (isLoading) {
    return (
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {Array(6)
          .fill(0)
          .map((_, idx) => (
            <motion.div
              key={idx}
              className="bg-white rounded-xl overflow-hidden h-80 border border-gray-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
            >
              <div className="h-full w-full flex flex-col">
                <motion.div
                  className="h-48 bg-gradient-to-br from-gray-100 to-gray-50"
                  variants={skeletonVariants}
                  animate="pulse"
                />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-32 bg-gray-200" />
                  <Skeleton className="h-4 w-24 bg-gray-200" />
                  <Skeleton className="h-10 w-full bg-gray-200" />
                </div>
              </div>
            </motion.div>
          ))}
      </motion.div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <motion.div
        className="text-center py-16"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-12 max-w-md mx-auto">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          >
            <MapPin size={48} className="mx-auto mb-4 text-gray-400" />
          </motion.div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            No Locations Found
          </h3>
          <p className="text-gray-600 leading-relaxed">
            There are no event locations available at the moment. Check back
            soon!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <AnimatePresence>
        {locations.map((location, idx) => {
          const locationName =
            "city" in location && location.city
              ? location.city
              : "name" in location && location.name
              ? location.name
              : "Unknown Location";

          const locationSlug =
            "slug" in location && location.slug ? location.slug : "";
          const locationId =
            "id" in location && location.id ? location.id : idx;
          const isHovered = hoveredCard === locationSlug;

          // Get stats for this location
          const stats = locationStats[locationSlug] || {
            eventsCount: 0,
            venuesCount: 0,
            liveEventsCount: 0,
          };

          // Get cover image
          const coverImage =
            "cover_image" in location && location.cover_image
              ? location.cover_image
              : null;

          return (
            <motion.div
              key={locationId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.3,
                delay: idx * 0.08,
                type: "spring",
                stiffness: 100,
              }}
              onHoverStart={() => setHoveredCard(locationSlug)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <Card
                className={`
                  min-h-[360px] overflow-hidden rounded-xl cursor-pointer group relative
                  bg-white border border-gray-200
                  shadow-sm hover:shadow-xl hover:border-gray-300
                  transition-all duration-300 ease-out
                  flex flex-col
                `}
                onClick={() => onSelect(locationSlug)}
              >
                {/* Background Image Section */}
                <div
                  className="relative h-44 overflow-hidden flex-shrink-0"
                  style={{ background: "var(--color-background)" }}
                >
                  {coverImage && typeof coverImage === "string" ? (
                    <Image
                      src={coverImage}
                      alt={locationName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        // Fallback to gradient if image fails
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 opacity-80"
                      style={{ background: "var(--color-background)" }}
                    />
                  )}

                  {/* Gradient Overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  {/* Top Badges Row */}
                  <div className="absolute top-3 left-3 right-3 z-10">
                    <div className="flex items-center justify-between gap-2">
                      {/* Left Side: Status Badges */}
                      <div className="flex items-center gap-1.5">
                        {/* New Badge */}
                        {stats.isNew && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: idx * 0.1 + 0.3 }}
                          >
                            <Badge className="bg-green-500/95 text-white border-0 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold shadow-lg whitespace-nowrap">
                              <Sparkles className="w-3 h-3 mr-1 inline-block" />
                              NEW
                            </Badge>
                          </motion.div>
                        )}
                      </div>

                      {/* Right Side: Event Categories - Always Visible */}
                      {stats.categories && stats.categories.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {stats.categories
                            .slice(0, 3)
                            .map((category, catIdx) => (
                              <div
                                key={catIdx}
                                className="bg-white/20 backdrop-blur-md text-white p-1.5 rounded-lg shadow-lg"
                                title={category}
                              >
                                {categoryIcons[category.toLowerCase()] ||
                                  categoryIcons.default}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location Name Overlay */}
                  <div className="absolute bottom-2 left-3 right-3 z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg flex-shrink-0">
                        <MapPin size={16} className="text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white drop-shadow-lg truncate">
                        {locationName}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="space-y-2.5 flex-1">
                    {/* Stats Row */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar
                        size={16}
                        className="text-[color:var(--color-primary)]"
                      />
                      <span className="font-semibold text-gray-900">
                        {stats.eventsCount || 0}
                      </span>
                      <span className="text-gray-500">Events</span>
                      {/* Venues count if available */}
                      {stats.venuesCount > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">
                            {stats.venuesCount} Venue
                            {stats.venuesCount !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Upcoming Event Preview - Always Visible */}
                    {stats.upcomingEvent ? (
                      <div className="flex items-start gap-2.5 text-xs bg-gradient-to-br from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/80 hover:border-gray-300 transition-colors">
                        <Clock
                          size={14}
                          className="flex-shrink-0 text-[color:var(--color-primary)] mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate mb-1">
                            Next: {stats.upcomingEvent.name}
                          </div>
                          <div className="text-gray-600 text-[11px]">
                            {new Date(
                              stats.upcomingEvent.date
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200/80">
                        <span className="text-xs text-gray-400 italic">
                          Check back soon for new events
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Explore Button - Always at bottom */}
                  <motion.button
                    className="
                      w-full bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/90
                      text-white py-2.5 px-4 rounded-lg text-sm font-semibold
                      flex items-center justify-center gap-2 
                      transition-all duration-200 
                      shadow-sm hover:shadow-md
                      mt-3 group-hover:shadow-lg
                    "
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span>Explore Events</span>
                    <motion.div
                      animate={{ x: isHovered ? 4 : 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <ArrowRight size={16} />
                    </motion.div>
                  </motion.button>
                </div>

                {/* Hover Effect Glow */}
                <motion.div
                  className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[color:var(--color-primary)] to-transparent opacity-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered ? 0.1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
