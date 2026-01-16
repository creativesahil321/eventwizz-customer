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
      <div className="bg-white/95 backdrop-blur-sm text-gray-900 py-4 border-b border-gray-200 shadow-sm">
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
                width={180}
                height={60}
                className="h-14 md:h-16 w-auto object-contain max-w-[200px]"
                alt={name || "EventWizz"}
                priority
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">
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
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium border-0 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <span>Book Now</span>
                      <ChevronDown size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white border border-gray-200 text-gray-900 p-2 rounded-lg shadow-lg w-48">
                    <div className="py-1 px-2 text-xs text-gray-500 border-b border-gray-200 mb-1">
                      Select a location
                    </div>
                    {isLoading ? (
                      <div className="py-2 px-2 text-sm text-gray-600">
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
                              className="flex items-center gap-2 py-2 px-2 hover:bg-gray-100 rounded-md text-sm cursor-pointer transition-colors"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <MapPin size={14} className="text-gray-600" />
                              <span>{locationName}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })
                    ) : (
                      <div className="py-2 px-2 text-sm text-gray-600">
                        No locations available
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
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
          className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-lg mobile-dropdown"
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
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium border-0 rounded-lg hover:bg-gray-800 transition-colors book-now-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownOpen(!dropdownOpen);
                    }}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen ? "true" : "false"}
                  >
                    Book Now
                    <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                {dropdownOpen && (
                  <DropdownMenuContent className="bg-white border border-gray-200 text-gray-900 p-2 rounded-lg shadow-lg w-full">
                    <div className="py-1 px-2 text-xs text-gray-500 border-b border-gray-200 mb-1">
                      Select a location
                    </div>
                    {isLoading ? (
                      <div className="py-2 px-2 text-sm text-gray-600">
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
                              className="flex items-center gap-2 py-2 px-2 hover:bg-gray-100 rounded-md text-sm transition-colors"
                              onClick={() => setDropdownOpen(false)}
                            >
                              <MapPin size={14} className="text-gray-600" />
                              <span>{locationName}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })
                    ) : (
                      <div className="py-2 px-2 text-sm text-gray-600">
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
