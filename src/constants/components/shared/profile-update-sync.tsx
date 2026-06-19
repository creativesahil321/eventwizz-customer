"use client";

import { useProfileSessionUpdate } from "@/hooks/useProfileSessionUpdate";
import { ProfileResponse } from "@/app/(protected)/_shared/profile/_lib/types";
import { ApiResponse } from "@/services/core/api-client";

interface ProfileUpdateSyncProps {
  children: React.ReactNode;
  onUpdate?: (response: ApiResponse<ProfileResponse["data"]>) => void;
}

/**
 * Component that provides a method to sync profile updates across
 * all places where user profile data is stored:
 * - NextAuth Session
 * - Zustand Auth Store
 *
 * This ensures consistent user data throughout the application.
 */
export function ProfileUpdateSync({
  children,
}: //  onUpdate,
ProfileUpdateSyncProps) {
  // const { updateProfileInSession } = useProfileSessionUpdate();

  /**
   * This function should be called after a successful profile update
   * to ensure all parts of the app reflect the updated profile data
   */
  // const syncProfileUpdate = async (
  //   response: ApiResponse<ProfileResponse["data"]>
  // ) => {
  //   if (response.status && response.data) {
  //     // Update session and auth store with new user data
  //     await updateProfileInSession({
  //       first_name: response.data.first_name,
  //       last_name: response.data.last_name,
  //       full_name: response.data.full_name,
  //       avatar: response.data.avatar,
  //       phone: response.data.phone || undefined,
  //       address: response.data.address || undefined,
  //       city: response.data.city || undefined,
  //       post_code: response.data.post_code || undefined,
  //     });

  //     // Call onUpdate callback if provided
  //     if (onUpdate) {
  //       onUpdate(response);
  //     }
  //   }
  // };

  return <>{children}</>;
}

// Export a hook that provides the sync function
export function useProfileSync() {
  const { updateProfileInSession } = useProfileSessionUpdate();

  /**
   * Sync profile update with session and auth store
   */
  const syncProfileUpdate = async (
    response: ApiResponse<ProfileResponse["data"]>
  ) => {
    if (response.status && response.data) {
      // Update session and auth store with new user data
      await updateProfileInSession({
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        full_name: response.data.full_name,
        avatar: response.data.avatar,
        phone: response.data.phone || undefined,
        address: response.data.address || undefined,
        city: response.data.city || undefined,
        post_code: response.data.post_code || undefined,
      });
    }
  };

  return { syncProfileUpdate };
}
