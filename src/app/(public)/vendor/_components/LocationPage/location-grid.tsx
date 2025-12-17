"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight, Sparkles, Calendar, Users } from "lucide-react";
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

  // Enhanced location card styles with more vibrant colors
  const locationStyles = [
    {
      bgGradient: "from-purple-600/30 via-purple-500/20 to-pink-500/30",
      hoverGradient: "from-purple-600/50 via-purple-500/40 to-pink-500/50",
      borderColor: "border-purple-400/50",
      shadowColor: "shadow-purple-500/25",
      glowColor: "0 0 40px rgba(168, 85, 247, 0.4)",
      iconColor: "text-purple-300",
      buttonBg: "bg-gradient-to-r from-purple-600 to-pink-600",
    },
    {
      bgGradient: "from-cyan-600/30 via-blue-500/20 to-teal-500/30",
      hoverGradient: "from-cyan-600/50 via-blue-500/40 to-teal-500/50",
      borderColor: "border-cyan-400/50",
      shadowColor: "shadow-cyan-500/25",
      glowColor: "0 0 40px rgba(34, 211, 238, 0.4)",
      iconColor: "text-cyan-300",
      buttonBg: "bg-gradient-to-r from-cyan-600 to-teal-600",
    },
    {
      bgGradient: "from-emerald-600/30 via-green-500/20 to-lime-500/30",
      hoverGradient: "from-emerald-600/50 via-green-500/40 to-lime-500/50",
      borderColor: "border-emerald-400/50",
      shadowColor: "shadow-emerald-500/25",
      glowColor: "0 0 40px rgba(16, 185, 129, 0.4)",
      iconColor: "text-emerald-300",
      buttonBg: "bg-gradient-to-r from-emerald-600 to-lime-600",
    },
    {
      bgGradient: "from-orange-600/30 via-red-500/20 to-pink-500/30",
      hoverGradient: "from-orange-600/50 via-red-500/40 to-pink-500/50",
      borderColor: "border-orange-400/50",
      shadowColor: "shadow-orange-500/25",
      glowColor: "0 0 40px rgba(251, 146, 60, 0.4)",
      iconColor: "text-orange-300",
      buttonBg: "bg-gradient-to-r from-orange-600 to-red-600",
    },
    {
      bgGradient: "from-indigo-600/30 via-purple-500/20 to-blue-500/30",
      hoverGradient: "from-indigo-600/50 via-purple-500/40 to-blue-500/50",
      borderColor: "border-indigo-400/50",
      shadowColor: "shadow-indigo-500/25",
      glowColor: "0 0 40px rgba(99, 102, 241, 0.4)",
      iconColor: "text-indigo-300",
      buttonBg: "bg-gradient-to-r from-indigo-600 to-blue-600",
    },
  ];

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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {Array(6)
          .fill(0)
          .map((_, idx) => (
            <motion.div
              key={idx}
              className="bg-black/40 backdrop-blur-md border border-gray-700/50 rounded-2xl overflow-hidden h-80"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <div className="h-full w-full flex flex-col p-6">
                <motion.div
                  className="h-full bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl flex flex-col items-center justify-center gap-4"
                  variants={skeletonVariants}
                  animate="pulse"
                >
                  <div className="w-12 h-12 bg-gray-700/50 rounded-full" />
                  <Skeleton className="h-8 w-32 bg-gray-700/50" />
                  <Skeleton className="h-10 w-28 bg-gray-700/30 rounded-lg" />
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
        <div className="bg-black/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-12 max-w-md mx-auto">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 0.1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 50 }}
          >
            <MapPin size={48} className="mx-auto mb-4 text-gray-400" />
          </motion.div>
          <h3 className="text-2xl font-medium text-white mb-3">
            No Locations Found
          </h3>
          <p className="text-gray-400 leading-relaxed">
            There are no event locations available at the moment. Check back
            soon!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
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
          const style = locationStyles[idx % locationStyles.length];
          const isHovered = hoveredCard === locationSlug;

          return (
            <motion.div
              key={locationId}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              transition={{
                duration: 0.6,
                delay: idx * 0.15,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                y: -8,
                transition: { duration: 0.3, type: "spring", stiffness: 300 },
              }}
              onHoverStart={() => setHoveredCard(locationSlug)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <Card
                className={`
                  h-80 overflow-hidden rounded-2xl cursor-pointer group relative
                  bg-gradient-to-br ${
                    isHovered ? style.hoverGradient : style.bgGradient
                  }
                  backdrop-blur-sm border-2 ${style.borderColor}
                  ${style.shadowColor} shadow-xl
                  transition-all duration-500
                `}
                style={{
                  boxShadow: isHovered ? style.glowColor : undefined,
                }}
                onClick={() => onSelect(locationSlug)}
              >
                {/* Animated background patterns */}
                <motion.div
                  className="absolute inset-0 opacity-10"
                  animate={{
                    background: isHovered
                      ? `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)`
                      : `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 50%)`,
                  }}
                  transition={{ duration: 0.5 }}
                />

                {/* Floating particles */}
                {isHovered && (
                  <motion.div className="absolute inset-0 pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white/30 rounded-full"
                        initial={{
                          x: Math.random() * 300,
                          y: Math.random() * 300,
                          opacity: 0,
                        }}
                        animate={{
                          x: Math.random() * 300,
                          y: Math.random() * 300,
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </motion.div>
                )}

                <div className="relative h-full flex flex-col p-8 justify-center items-center">
                  {/* Decorative border */}
                  <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-xl transition-all duration-500 group-hover:border-white/50" />

                  {/* Icon with enhanced animations */}
                  <motion.div
                    className="flex justify-center items-center mb-6 relative"
                    animate={{
                      scale: isHovered ? 1.2 : 1,
                      rotate: isHovered ? 360 : 0,
                    }}
                    transition={{
                      duration: 0.6,
                      type: "spring",
                      stiffness: 200,
                    }}
                  >
                    <motion.div
                      className={`p-4 rounded-full bg-white/10 ${style.iconColor} backdrop-blur-sm`}
                      whileHover={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        scale: 1.1,
                      }}
                    >
                      <MapPin size={32} />
                    </motion.div>

                    {/* Animated ring around icon */}
                    <motion.div
                      className="absolute inset-0 border-2 border-white/20 rounded-full"
                      animate={{
                        scale: isHovered ? [1, 1.5, 1] : 1,
                        opacity: isHovered ? [1, 0, 1] : 0.5,
                      }}
                      transition={{
                        duration: 2,
                        repeat: isHovered ? Infinity : 0,
                      }}
                    />
                  </motion.div>

                  {/* Location name with text effects */}
                  <motion.h3
                    className="text-2xl md:text-3xl font-bold text-white uppercase mb-6 text-center leading-tight"
                    animate={{
                      scale: isHovered ? 1.05 : 1,
                      textShadow: isHovered
                        ? "0 0 20px rgba(255,255,255,0.5)"
                        : "0 0 0px rgba(255,255,255,0)",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {locationName}
                  </motion.h3>

                  {/* Stats or additional info */}
                  <motion.div
                    className="flex items-center gap-4 mb-6 text-white/70 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0.7 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>Events</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>Community</span>
                    </div>
                  </motion.div>

                  {/* Enhanced explore button */}
                  <motion.button
                    className={`
                      ${style.buttonBg} text-white px-8 py-3 rounded-xl text-sm font-semibold
                      shadow-lg hover:shadow-xl transition-all duration-300
                      flex items-center gap-2 relative overflow-hidden group/btn
                    `}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{
                      y: 0,
                      opacity: 1,
                      transition: { delay: 0.3 + idx * 0.1 },
                    }}
                  >
                    {/* Button background animation */}
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />

                    <Sparkles size={16} className="animate-pulse" />
                    <span className="relative z-10">Explore Events</span>

                    <motion.div
                      animate={{ x: isHovered ? 5 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight size={16} />
                    </motion.div>
                  </motion.button>

                  {/* Hover indicator */}
                  <motion.div
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: isHovered ? 1 : 0,
                      y: isHovered ? 0 : 10,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-white/60 rounded-full"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.6, 1, 0.6],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
