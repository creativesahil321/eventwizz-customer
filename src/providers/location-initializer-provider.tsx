"use client";

import { useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useLocationStore } from "@/store/location.store";
import { usePathname, useRouter } from "next/navigation";
import { locationService } from "@/services/vendor/locations/locations.service";
import { VenueLocation } from "@/types/api.types";

interface LocationInitializerProviderProps {
  children: ReactNode;
}

export function LocationInitializerProvider({
  children,
}: Readonly<LocationInitializerProviderProps>) {
  const { status, data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { selectedLocation, setLocations, allLocations, setSelectedLocation } =
    useLocationStore();
  const [isLoading, setIsLoading] = useState(true);

  // Get user account type
  const userAccountType = session?.user?.account_type;
  const isVendor = userAccountType === "vendor";

  // Paths that should bypass the location check
  const bypassPaths = [
    "/vendor/venue-locations/create",
    "/vendor/venue-locations",
    "/vendor/venue-locations/edit",
    "/auth/login",
    "/auth/register",
    "/on-boarding",
    "/welcome/select-location",
  ];

  // Check if we're on the location selection page or dashboard
  const isOnWelcomePage = pathname?.startsWith("/welcome/");

  // Check if current path is in bypassPaths or starts with any of them
  const shouldBypassCheck =
    bypassPaths.some(
      (path) => pathname === path || pathname?.startsWith(path)
    ) || isOnWelcomePage;

  // Special check if coming from onboarding step 14
  const isComingFromOnboardingFinal = pathname === "/on-boarding/step-14";

  // Check if we're on the dashboard
  const isOnDashboard = pathname === "/vendor/dashboard";

  useEffect(() => {
    if (status === "loading") return;

    // If user is not a vendor, don't initialize locations
    if (!isVendor) {
      setIsLoading(false);
      return;
    }

    // When we directly access /welcome/select-location, don't redirect
    if (isOnWelcomePage) {
      setIsLoading(false);
      return;
    }

    const initializeLocations = async () => {
      // If user is not authenticated, don't proceed
      if (status !== "authenticated") {
        setIsLoading(false);
        return;
      }

      try {
        // 1. First check if we already have locations in the Zustand store
        if (allLocations && allLocations.length > 0 && selectedLocation?.id) {
          // We already have locations and a selected location in the store
          // No need to fetch anything or redirect
          setIsLoading(false);
          return;
        }

        // 2. Check for location in session data second (already fetched during login)
        const sessionLocations = session?.user?.venue_locations;
        const sessionDefaultLocation = session?.user?.default_venue_location;

        if (
          (sessionLocations && sessionLocations.length > 0) ||
          sessionDefaultLocation
        ) {
          // We have locations in the session, use them instead of fetching again
          if (sessionLocations && sessionLocations.length > 0) {
            // Normalize locations to ensure is_default is boolean and preserve all fields
            const normalizedLocations = sessionLocations.map((loc) => ({
              ...loc,
              is_default: Boolean(loc.is_default),
            }));

            setLocations(normalizedLocations);

            // Set selected location from session
            const defaultLocation = normalizedLocations.find(
              (loc) => loc.is_default === true
            );
            if (defaultLocation) {
              setSelectedLocation(defaultLocation);
            } else if (sessionDefaultLocation) {
              const normalizedDefaultLocation = {
                ...sessionDefaultLocation,
                is_default: Boolean(sessionDefaultLocation.is_default),
              };
              setSelectedLocation(normalizedDefaultLocation);
            } else if (normalizedLocations.length > 0) {
              setSelectedLocation(normalizedLocations[0]);
            }

            setIsLoading(false);
            // Check if redirect needed based on cache
            checkAndHandleRedirect();
            return;
          } else if (sessionDefaultLocation) {
            // If we only have a default location in session
            const normalizedDefaultLocation = {
              ...sessionDefaultLocation,
              is_default: Boolean(sessionDefaultLocation.is_default),
            };
            setLocations([normalizedDefaultLocation]);
            setSelectedLocation(normalizedDefaultLocation);

            setIsLoading(false);
            // Check if redirect needed based on cache
            checkAndHandleRedirect();
            return;
          }
        }

        // 3. Check for location in localStorage as last resort
        const storedLocationId =
          typeof window !== "undefined"
            ? localStorage.getItem("vendor_location_id")
            : null;

        // If we have a stored ID but nothing else, we need to fetch
        const needToFetchLocations =
          // Nothing in store or session, might need to fetch
          (!allLocations || allLocations.length === 0) &&
          // And we're either missing a selected location or on a page that requires fresh location data
          (!selectedLocation?.id ||
            isOnWelcomePage ||
            pathname?.includes("/venue-locations") ||
            pathname?.includes("/location"));

        // Only fetch locations if truly needed
        if (needToFetchLocations) {
          // Use Promise.race with a timeout to avoid hanging indefinitely
          const locationPromise = Promise.race([
            locationService.getLocations(),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Location fetch timed out")),
                8000
              )
            ),
          ]);

          try {
            const response = await locationPromise;
            if (
              response &&
              typeof response === "object" &&
              "status" in response &&
              response.status &&
              "data" in response &&
              response.data
            ) {
              if (response.data.data && Array.isArray(response.data.data)) {
                // Normalize locations to ensure is_default is boolean and preserve all fields
                const locations = response.data.data.map((loc) => ({
                  ...loc,
                  is_default: Boolean(loc.is_default),
                })) as VenueLocation[];

                setLocations(locations);

                // If we have a stored location ID, try to select that location
                if (storedLocationId && locations.length > 0) {
                  const storedLocation = locations.find(
                    (loc) => loc.id === Number(storedLocationId)
                  );
                  if (storedLocation) {
                    // Ensure is_default is boolean and preserve all fields
                    const normalizedLocation = {
                      ...storedLocation,
                      is_default: Boolean(storedLocation.is_default),
                    };
                    setSelectedLocation(normalizedLocation);
                    setIsLoading(false);

                    // Check if we need to redirect based on our newly loaded data
                    checkAndHandleRedirect();
                    return;
                  }
                }
              }
            }
          } catch (timeoutError) {
            console.error("Location API timed out:", timeoutError);
            // Continue the flow with any cached data we might have
          }
        }

        setIsLoading(false);

        // Check if we need to redirect
        checkAndHandleRedirect();
      } catch (error) {
        console.error("Error initializing locations:", error);
        setIsLoading(false);
      }
    };

    // Separate function to check redirect conditions after data is loaded
    function checkAndHandleRedirect() {
      // Don't redirect if we should bypass location check
      if (shouldBypassCheck) {
        return;
      }

      // Get from store again to ensure we have latest values
      const currentSelectedLocation =
        useLocationStore.getState().selectedLocation;

      // Check if we should redirect to location selection page
      const needsToSelectLocation =
        // No location selected yet
        !currentSelectedLocation?.id ||
        // Coming from onboarding step 14
        isComingFromOnboardingFinal;

      // Only redirect if user needs to select a location and isn't already on dashboard
      if (needsToSelectLocation && !isOnDashboard && isVendor) {
        // Use router.push instead of window.location for better transitions
        window.location.href = "/welcome/select-location";
      }
    }

    // Execute the initialization function
    initializeLocations();
  }, [
    status,
    pathname,
    isComingFromOnboardingFinal,
    router,
    isOnWelcomePage,
    selectedLocation,
    allLocations,
    setSelectedLocation,
    setLocations,
    isVendor,
    isOnDashboard,
    shouldBypassCheck,
    session?.user?.venue_locations,
    session?.user?.default_venue_location,
  ]);

  // Don't render anything while loading to prevent flashing
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}
