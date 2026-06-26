import { useAuthStore } from "@/store/auth.store";
import { UserRole } from "@/services/common/notification/type";

/**
 * A hook to determine the current user's role from the auth store
 * @returns The authenticated user role
 */
export function useActiveRole(): UserRole {
  const { active_role, account_type } = useAuthStore();

  // Only use authenticated roles from the auth store
  // Default to "vendor" if no role is found (this should be handled by auth guards)
  return (active_role as UserRole) || (account_type as UserRole) || "customer";
}
