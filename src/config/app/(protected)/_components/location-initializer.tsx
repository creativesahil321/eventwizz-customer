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

  // Fetch locations on mount for vendors only (pure React Query, no store)
  useLocations({}, { enabled: isVendor });

  return <LocationInitializerProvider>{null}</LocationInitializerProvider>;
}
