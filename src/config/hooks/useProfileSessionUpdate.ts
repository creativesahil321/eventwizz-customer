import { useSession } from "next-auth/react";
import { authService } from "@/services/common/auth/auth.service";
import { useAuthStore } from "@/store/auth.store";

/**
 * Hook to update user profile data in both session and auth store
 * This ensures profile changes are reflected immediately in the UI
 * without requiring a page refresh
 */
export function useProfileSessionUpdate() {
  const { update } = useSession();
  const { updateUser } = useAuthStore();

  /**
   * Update profile data in the session and auth store
   * @param profileData User profile data to update
   */
  const updateProfileInSession = async (profileData: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar?: string;
    phone?: string;
    address?: string;
    city?: string;
    post_code?: string;
  }) => {
    try {
      // Format the data using the auth service for NextAuth session
      const sessionUpdateData = await authService.updateProfileInSession(
        profileData
      );

      // Update the session with the formatted data
      await update(sessionUpdateData);

      // Also update the Zustand auth store
      updateUser({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        full_name: profileData.full_name,
        avatar: profileData.avatar,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to update profile in session:", error);
      return { success: false, error };
    }
  };

  return { updateProfileInSession };
}
