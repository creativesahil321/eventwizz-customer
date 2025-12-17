"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocationStore } from "@/store/location.store";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import LocationSelectionHeader from "./_components/LocationPage/location-selection-header";
import LocationGrid from "./_components/LocationPage/location-grid";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import SubscribeSection from "./_components/EventListPage/subscribe";

export default function VendorSiteHomePage() {
  const router = useRouter();
  const { allLocations } = useLocationStore();
  const [isLoading, setIsLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const { settings, isLoading: isDomainLoading } = useDomain();
  const { scrollY } = useScroll();

  // Add state for screen dimensions to avoid window reference during SSR
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);

  // Initialize client-side indicators
  useEffect(() => {
    setIsClient(true);
    setScreenSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Parallax effects
  const textY = useTransform(scrollY, [0, 500], [0, -50]);

  useEffect(() => {
    let animationFrameId: number;

    const updateMousePosition = (e: MouseEvent) => {
      animationFrameId = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener("mousemove", updateMousePosition);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Visibility animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Function to handle location selection
  const handleLocationSelect = (slug: string) => {
    router.push(`/${slug}`);
  };

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

  // Floating particles animation - only rendered client-side now
  const particles = isClient
    ? Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          initial={{
            x: Math.random() * screenSize.width,
            y: Math.random() * screenSize.height,
          }}
          animate={{
            x: Math.random() * screenSize.width,
            y: Math.random() * screenSize.height,
          }}
          transition={{
            duration: Math.random() * 20 + 10,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear",
          }}
        />
      ))
    : [];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated background with parallax */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%)`,
        }}
      >
        <Image
          src="/assets/images/Homepage/Homepage-Banner.png"
          alt="Concert background"
          fill
          className="object-cover scale-110"
          priority
        />

        {/* Dynamic gradient overlay that follows mouse */}
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-transparent via-black/30 to-black/70"
          animate={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%)`,
          }}
          transition={{ type: "tween", ease: "backOut", duration: 0.5 }}
        />

        {/* Animated overlay */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* Floating particles - only rendered client-side */}
        <AnimatePresence>{isClient && isVisible && particles}</AnimatePresence>
      </motion.div>

      {/* Animated grid pattern overlay */}
      <motion.div
        className="absolute inset-0 opacity-10 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 2 }}
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <LocationSelectionHeader
        name={settings?.name || "EventWizz"}
        logo={settings?.logo}
      />

      <motion.main
        className="flex-1 container mx-auto px-4 py-16 z-10 relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Hero section with enhanced animations */}
        <motion.div className="text-center mb-16" style={{ y: textY }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.2,
            }}
          >
            <motion.h1
              className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.3,
                duration: 0.8,
                type: "spring",
                stiffness: 100,
              }}
            >
              <motion.span
                className="inline-block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
                whileHover={{
                  scale: 1.05,
                  textShadow: "0 0 20px rgba(168, 85, 247, 0.5)",
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                Select A Location
              </motion.span>
              <br className="hidden md:inline" />
              <motion.span
                className="inline-block"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                {" "}
                To Discover Amazing Events
              </motion.span>
            </motion.h1>

            <motion.p
              className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.5,
                duration: 0.7,
                type: "spring",
                stiffness: 80,
              }}
            >
              Find the perfect events that match your interests in your area
            </motion.p>

            {/* Animated decorative elements */}
            <motion.div
              className="flex justify-center items-center gap-4 mt-8"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Enhanced location grid with stagger animation */}
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.4,
            type: "spring",
            stiffness: 50,
          }}
        >
          <LocationGrid
            locations={allLocations}
            isLoading={isLoading || isDomainLoading}
            onSelect={handleLocationSelect}
          />
        </motion.div>

        {/* Call-to-action section */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 text-white/80"
            whileHover={{
              scale: 1.05,
              backgroundColor: "rgba(255,255,255,0.15)",
              boxShadow: "0 0 30px rgba(255,255,255,0.2)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🎉
            </motion.span>
            <span>Ready to find your next adventure?</span>
          </motion.div>
        </motion.div>
      </motion.main>

      <SubscribeSection />

      <motion.footer
        className="relative z-10 bg-black/50 backdrop-blur-md text-white py-8 border-t border-white/10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <motion.p
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {settings?.copyright || "© 2023 EventWizz. All rights reserved."}
            </motion.p>

            <div className="flex gap-6">
              {["Privacy Policy", "Terms of Service", "Contact"].map(
                (link, i) => (
                  <motion.a
                    key={link}
                    href="#"
                    className="text-white/70 hover:text-white transition-colors relative"
                    whileHover={{
                      scale: 1.05,
                      color: "rgba(255,255,255,1)",
                    }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + i * 0.1, duration: 0.5 }}
                  >
                    {link}
                    <motion.div
                      className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-cyan-400"
                      whileHover={{ width: "100%" }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.a>
                )
              )}
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
