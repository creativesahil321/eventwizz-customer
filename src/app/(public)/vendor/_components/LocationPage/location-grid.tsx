"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight, Calendar, Users } from "lucide-react";
import { VenueLocation } from "@/types/api.types";
import { LocationData } from "@/types/theme.types";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState } from "react";

// Generic location type to handle both API types
interface LocationGridProps {
  locations: (VenueLocation | LocationData)[];
  isLoading: boolean;
  onSelect: (slug: string) => void;
}

export default function LocationGrid({
  locations,
  isLoading,
  onSelect,
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
              className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg overflow-hidden h-64"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
            >
              <div className="h-full w-full flex flex-col p-6">
                <motion.div
                  className="h-full bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg flex flex-col items-center justify-center gap-4"
                  variants={skeletonVariants}
                  animate="pulse"
                >
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <Skeleton className="h-6 w-32 bg-gray-200" />
                  <Skeleton className="h-4 w-24 bg-gray-200" />
                </motion.div>
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
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-12 max-w-md mx-auto">
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
                  h-64 overflow-hidden rounded-lg cursor-pointer group relative
                  bg-white/95 backdrop-blur-sm border border-gray-200
                  hover:shadow-xl hover:border-gray-300
                  transition-all duration-300
                `}
                onClick={() => onSelect(locationSlug)}
              >
                <div className="relative h-full flex flex-col p-6">
                  {/* Location icon and name */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <motion.div
                      className="mb-4 p-3 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors duration-300"
                      animate={{
                        scale: isHovered ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <MapPin size={32} className="text-gray-700" />
                    </motion.div>

                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      {locationName}
                    </h3>

                    {/* Event stats preview */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={16} />
                        <span>Events</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-gray-400" />
                      <div className="flex items-center gap-1.5">
                        <Users size={16} />
                        <span>Venues</span>
                      </div>
                    </div>
                  </div>

                  {/* Explore button */}
                  <motion.button
                    className="
                      w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 px-4 rounded-lg text-sm font-medium
                      flex items-center justify-center gap-2 transition-colors duration-200
                    "
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>Explore Events</span>
                    <motion.div
                      animate={{ x: isHovered ? 3 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight size={16} />
                    </motion.div>
                  </motion.button>
                </div>

                {/* Subtle hover effect overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/50 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered ? 1 : 0 }}
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
