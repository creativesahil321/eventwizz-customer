"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocationStore } from "@/store/location.store";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth.store";

interface LocationGuardProps {
  children: ReactNode;
  fallbackPath?: string;
  bypassPaths?: string[];
}

/**
 * LocationGuard - A component that ensures a location is selected before rendering its children
 *
 * @param children - The content to render if a location is selected
 * @param fallbackPath - The path to redirect to if no location is selected (default: "/welcome/select-location")
 * @param bypassPaths - Array of paths that don't require a location (e.g., settings pages)
 */
export function LocationGuard({
  children,
  fallbackPath = "/welcome/select-location",
  bypassPaths = [],
}: LocationGuardProps) {
  const { hasLocation, setSelectedLocation, allLocations } = useLocationStore();
  const { data: session } = useSession();
  const account_type = useAuthStore((state) => state.account_type);
  const router = useRouter();
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);

  // Default paths that should bypass the location check
  const defaultBypassPaths = [
    "/vendor/venue-locations",
    "/vendor/venue-locations/create",
    "/vendor/venue-locations/edit",
    "/auth/login",
    "/auth/register",
    "/on-boarding",
    "/welcome/select-location",
  ];

  // Combine default and custom bypass paths
  const allBypassPaths = [...defaultBypassPaths, ...bypassPaths];

  // Check if current path should bypass location check
  const shouldBypass = allBypassPaths.some(
    (path) => pathname === path || pathname?.startsWith(path)
  );

  // Check if user is a vendor
  const isVendor =
    account_type === "vendor" || session?.user?.account_type === "vendor";

  // Check localStorage for location ID on mount to prevent unnecessary redirects
  useEffect(() => {
    const checkLocalStorage = () => {
      if (typeof window === "undefined") return;

      // If we already have a location, no need to check localStorage
      if (hasLocation()) {
        setIsInitializing(false);
        return;
      }

      // Only check location for vendor users
      if (!isVendor) {
        setIsInitializing(false);
        return;
      }

      // Try to get location ID from localStorage
      const storedLocationId = localStorage.getItem("vendor_location_id");

      if (storedLocationId && allLocations?.length > 0) {
        // Try to find the location in our store
        const storedLocation = allLocations.find(
          (loc) => loc.id === Number(storedLocationId)
        );

        if (storedLocation) {
          // Restore the location from localStorage
          setSelectedLocation(storedLocation);
        }
      }

      // Initialization complete
      setIsInitializing(false);
    };

    // Small timeout to ensure store is hydrated
    const timer = setTimeout(checkLocalStorage, 100);
    return () => clearTimeout(timer);
  }, [hasLocation, setSelectedLocation, allLocations, isVendor]);

  // Handle redirection if needed
  useEffect(() => {
    // Don't redirect during initialization
    if (isInitializing) return;

    // If we should bypass the check, render children immediately
    if (shouldBypass) return;

    // Only apply location check for vendor users
    if (!isVendor) return;

    // If no location is selected, redirect to the fallback path
    if (!hasLocation()) {
      router.push(fallbackPath);
    }
  }, [
    hasLocation,
    router,
    fallbackPath,
    shouldBypass,
    isInitializing,
    isVendor,
  ]);

  // During initialization, render nothing to prevent flash
  if (isInitializing) {
    return null;
  }

  // If we should bypass, not a vendor, or have a location, render children
  if (shouldBypass || !isVendor || hasLocation()) {
    return <>{children}</>;
  }

  // Otherwise render nothing while redirecting
  return null;
}
