"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth.store";
import { AuthRedirectingSkeleton } from "@/app/(auth)/_components/auth-redirecting-skeleton";

interface LocationGuardProps {
  children: ReactNode;
  fallbackPath?: string;
  bypassPaths?: string[];
}

/**
 * LocationGuard - A component that ensures a location is selected before rendering its children
 * Uses session.user.vendor_location_id instead of Zustand store
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
  const { data: session, status } = useSession();
  const account_type = useAuthStore((state) => state.account_type);
  const router = useRouter();
  const pathname = usePathname();
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const isFirstLoad = useRef(true);

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
    (path) => pathname === path || pathname?.startsWith(path),
  );

  // Check if user is a vendor
  const isVendor =
    account_type === "vendor" || session?.user?.account_type === "vendor";

  // Check if location exists in session
  const hasLocation = !!session?.user?.vendor_location_id;

  // Mark as loaded once session has loaded for the first time
  useEffect(() => {
    if (status !== "loading" && isFirstLoad.current) {
      setHasInitiallyLoaded(true);
      isFirstLoad.current = false;
    }
  }, [status]);

  // Handle redirection if needed
  useEffect(() => {
    // Don't redirect during first load
    if (!hasInitiallyLoaded) return;

    // If we should bypass the check, render children immediately
    if (shouldBypass) return;

    // Only apply location check for vendor users
    if (!isVendor) return;

    // If no location is selected, redirect to the fallback path
    if (!hasLocation) {
      router.push(fallbackPath);
    }
  }, [
    hasLocation,
    router,
    fallbackPath,
    shouldBypass,
    hasInitiallyLoaded,
    isVendor,
  ]);

  // Only show loading on very first mount, not on session updates
  if (!hasInitiallyLoaded) {
    return <AuthRedirectingSkeleton />;
  }

  // If we should bypass, not a vendor, or have a location, render children
  if (shouldBypass || !isVendor || hasLocation) {
    return <>{children}</>;
  }

  // Otherwise render nothing while redirecting
  return null;
}
