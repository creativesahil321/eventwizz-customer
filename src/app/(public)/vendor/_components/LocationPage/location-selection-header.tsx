"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, ChevronDown, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocationStore } from "@/store/location.store";

interface LocationSelectionHeaderProps {
  logo?: string;
  name?: string;
}

export default function LocationSelectionHeader({
  logo,
  name,
}: LocationSelectionHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false); // State for controlling dropdown visibility
  const { allLocations, isLoading } = useLocationStore();

  // Close mobile menu if user clicks outside
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        mobileMenuOpen &&
        event.target instanceof Element &&
        !event.target.closest(".mobile-dropdown")
      ) {
        setMobileMenuOpen(false);
      }
      if (
        dropdownOpen &&
        event.target instanceof Element &&
        !event.target.closest(".book-now-btn")
      ) {
        setDropdownOpen(false);
      }
    },
    [mobileMenuOpen, dropdownOpen]
  );

  useEffect(() => {
    // Listen for click events outside the menu to close it
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <header className="relative z-30">
      {/* Main header */}
      <div className="bg-black/40 backdrop-blur-md text-white py-4 border-b border-white/10">
        <div className="container mx-auto flex items-center justify-between px-4">
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {logo ? (
              <Image
                src={logo}
                width={120}
                height={40}
                className="max-h-12 w-auto object-contain"
                alt={name || "EventWizz"}
                priority
              />
            ) : (
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {name || "EventWizz"}
              </h1>
            )}
          </motion.div>

          <div className="flex items-center gap-4">
            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-medium border border-white/20 backdrop-blur-md rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:bg-white/20 transition"
                    >
                      <span>Book Now</span>
                      <ChevronDown size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-black/80 backdrop-blur-md border border-white/20 text-white p-2 rounded-md w-48">
                    <div className="py-1 px-2 text-xs text-white/70 border-b border-white/10 mb-1">
                      Select a location
                    </div>
                    {isLoading ? (
                      <div className="py-2 px-2 text-sm text-white/70">
                        Loading locations...
                      </div>
                    ) : allLocations.length > 0 ? (
                      allLocations.map((location) => {
                        const locationName =
                          "city" in location && location.city
                            ? location.city
                            : "name" in location && location.name
                            ? location.name
                            : "Unknown Location";

                        const locationSlug =
                          "slug" in location && location.slug
                            ? location.slug
                            : "";

                        return (
                          <DropdownMenuItem key={locationSlug} asChild>
                            <Link
                              href={`/${locationSlug}`}
                              className="flex items-center gap-2 py-2 px-2 hover:bg-white/10 rounded-sm text-sm cursor-pointer"
                              onClick={() => setMobileMenuOpen(false)} // Close mobile menu after selection
                            >
                              <MapPin size={14} />
                              <span>{locationName}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })
                    ) : (
                      <div className="py-2 px-2 text-sm text-white/70">
                        No locations available
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-1 rounded-md hover:bg-white/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          className="md:hidden absolute top-full left-0 w-full bg-black/90 backdrop-blur-md border-b border-white/10 mobile-dropdown"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="py-4 px-4">
            <nav className="flex flex-col gap-4 mb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-medium border border-white/20 backdrop-blur-md rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:bg-white/20 transition book-now-btn"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent mobile menu from closing
                      setDropdownOpen(!dropdownOpen); // Toggle dropdown
                    }}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen ? "true" : "false"}
                  >
                    Book Now
                    <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                {dropdownOpen && (
                  <DropdownMenuContent className="bg-black/80 backdrop-blur-md border border-white/20 text-white p-2 rounded-md w-full">
                    <div className="py-1 px-2 text-xs text-white/70 border-b border-white/10 mb-1">
                      Select a location
                    </div>
                    {isLoading ? (
                      <div className="py-2 px-2 text-sm text-white/70">
                        Loading locations...
                      </div>
                    ) : allLocations.length > 0 ? (
                      allLocations.map((location) => {
                        const locationName =
                          "city" in location && location.city
                            ? location.city
                            : "name" in location && location.name
                            ? location.name
                            : "Unknown Location";

                        const locationSlug =
                          "slug" in location && location.slug
                            ? location.slug
                            : "";

                        return (
                          <DropdownMenuItem key={locationSlug} asChild>
                            <Link
                              href={`/${locationSlug}`}
                              className="flex items-center gap-2 py-2 px-2 hover:bg-white/10 rounded-sm text-sm"
                              onClick={() => setDropdownOpen(false)} // Close dropdown after selection
                            >
                              <MapPin size={14} />
                              <span>{locationName}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })
                    ) : (
                      <div className="py-2 px-2 text-sm text-white/70">
                        No locations available
                      </div>
                    )}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            </nav>
          </div>
        </motion.div>
      )}
    </header>
  );
}
