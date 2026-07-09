"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth.store";
import { useProfileData } from "@/app/(protected)/_shared/profile/_lib/queries";

export function useSupportCustomerProfile() {
  const { data: session } = useSession();
  const user = useAuthStore((state) => state.user);
  const { data: profileResponse, isLoading } = useProfileData({}, "customer");
  const profile = profileResponse?.data;

  const profileData = useMemo(() => {
    const firstName =
      profile?.first_name ||
      user?.first_name ||
      session?.user?.first_name ||
      "";
    const lastName =
      profile?.last_name ||
      user?.last_name ||
      session?.user?.last_name ||
      "";

    const name =
      profile?.full_name?.trim() ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      session?.user?.name?.trim() ||
      "You";

    const email =
      profile?.email || user?.email || session?.user?.email || "";

    const phone = profile?.phone || "";

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
      name,
      email,
      phone,
      timezone,
      initials: name.charAt(0).toUpperCase() || "Y",
      isLoading,
    };
  }, [profile, user, session, isLoading]);

  return profileData;
}
