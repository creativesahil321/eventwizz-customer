"use client";

import { LocationInitializerProvider } from "@/providers/location-initializer-provider";
import { useLocations } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth.store";

export function LocationInitializer() {
  const { data: session } = useSession();
  const accountType = useAuthStore((state) => state.account_type);
  const userAccountType = session?.user?.account_type || accountType;
  const isVendor = userAccountType === "vendor";

  // Use TanStack Query to fetch locations - this will automatically
  // populate the Zustand store and set the default location
  // Only enable the query for vendor users to prevent vendor endpoint access by admin and other user types
  useLocations({}, { enabled: isVendor });

  return <LocationInitializerProvider>{null}</LocationInitializerProvider>;
}
