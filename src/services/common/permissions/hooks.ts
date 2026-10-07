import { useQuery } from "@tanstack/react-query";
import { permissionService } from "./permission.service";
import { usePermissionStore } from "@/store/permission.store";
import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { logout } from "@/lib/auth/logout";

// Define query keys
export const permissionKeys = {
  all: ["permissions"] as const,
  user: () => [...permissionKeys.all, "user"] as const,
};

/**
 * Hook to fetch permissions from the API
 * This is used as a fallback when localStorage is cleared or permissions are not available
 */
export function usePermissionQuery() {
  return useQuery({
    queryKey: permissionKeys.user(),
    queryFn: async () => {
      // The service now directly returns the permissions array
      return await permissionService.getUserPermissions();
    },
    enabled: false, // Don't fetch on mount, we'll trigger manually
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Reduce retry count to avoid excessive retries
    retryDelay: 3000, // Add delay between retries
  });
}

/**
 * Default permission keys that should always be available to customers
 * These ensure customers have a usable UI even without API permissions
 */
const CUSTOMER_DEFAULT_PERMISSIONS = [
  "read-dashboard",
  "read-profile",
  "read-order",
  "read-event",
  "read-menu-choice",
  "read-notification",
  "read-payment-method",
  "read-support",
  "read-wishlist",
];

/**
 * Hook for loading permissions with fallback mechanisms
 * Automatically handles rehydration from API if permissions are not in store
 */
export function useLoadPermissions() {
  const { permissions, setPermissions, isLoaded, reset } = usePermissionStore();
  const { refetch, isLoading: isQueryLoading } = usePermissionQuery();
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [consecutiveEmptyResponses, setConsecutiveEmptyResponses] = useState(0);

  // Get authentication status and user type
  const { isAuthenticated, active_role } = useAuthStore();

  /**
   * Get default permissions for customer users
   * @returns Array of permission keys for customers
   */
  const getDefaultCustomerPermissions = useCallback((): string[] => {
    return active_role === "customer" ? CUSTOMER_DEFAULT_PERMISSIONS : [];
  }, [active_role]);

  /**
   * Handle potential security violations by logging the user out
   */
  const handlePotentialSecurityViolation =
    useCallback(async (): Promise<void> => {
      console.warn(
        "[Permissions] Potential security violation: Multiple permission access failures"
      );
      await logout({ reason: "security_violation" });
    }, []);

  // Effect to load permissions if they're not in Zustand store
  useEffect(() => {
    // Customers do not use permissions; mark as loaded immediately and skip API
    if (isAuthenticated && active_role === "customer") {
      if (!isLoaded) setPermissions([]);
      return;
    }

    if (
      isAuthenticated &&
      !isLoaded &&
      permissions.length === 0 &&
      !fetchAttempted
    ) {
      setFetchAttempted(true);

      // Try to fetch from API as a fallback
      refetch()
        .then(({ data, isError }) => {
          if (data && Array.isArray(data) && data.length > 0) {
            setPermissions(data);
            setConsecutiveEmptyResponses(0); // Reset counter on success
          } else if (
            isError ||
            (data && Array.isArray(data) && data.length === 0)
          ) {
            // Track empty responses for potential security violations
            setConsecutiveEmptyResponses((prev) => prev + 1);

            // Check if this might be malicious (multiple failures)
            if (active_role !== "customer" && consecutiveEmptyResponses >= 2) {
              handlePotentialSecurityViolation();
              return;
            }

            // If no permissions received, apply defaults for customers
            const defaultPermissions = getDefaultCustomerPermissions();
            if (defaultPermissions.length > 0) {
              setPermissions(defaultPermissions);
            } else {
              // For non-customers with no permissions, just mark as loaded with empty array
              setPermissions([]);
            }
          }
        })
        .catch((error) => {
          console.error("[Permissions] Error fetching permissions:", error);

          // Track failed requests for potential security violations
          setConsecutiveEmptyResponses((prev) => prev + 1);

          // Check if this might be malicious (multiple failures)
          if (active_role !== "customer" && consecutiveEmptyResponses >= 2) {
            handlePotentialSecurityViolation();
            return;
          }

          // Apply defaults for customers on API error
          const defaultPermissions = getDefaultCustomerPermissions();
          if (defaultPermissions.length > 0) {
            setPermissions(defaultPermissions);
          } else {
            // For non-customers, mark as loaded with empty array
            setPermissions([]);
          }
        });
    }

    // If user is logged out, reset permissions
    if (!isAuthenticated && (isLoaded || permissions.length > 0)) {
      reset();
    }
  }, [
    permissions,
    isLoaded,
    isAuthenticated,
    active_role,
    setPermissions,
    refetch,
    reset,
    fetchAttempted,
    consecutiveEmptyResponses,
    getDefaultCustomerPermissions,
    handlePotentialSecurityViolation,
  ]);

  return {
    permissions,
    isLoading: isQueryLoading && !isLoaded && isAuthenticated,
    refetchPermissions: refetch,
  };
}

/**
 * Hook to force refresh permissions from the API
 * Useful for scenarios where permissions might have changed on the server
 */
export function useRefreshPermissions() {
  const { setPermissions } = usePermissionStore();
  const { refetch, isLoading } = usePermissionQuery();
  const { isAuthenticated } = useAuthStore();

  const refreshPermissions = async () => {
    // Don't attempt to refresh if not authenticated
    if (!isAuthenticated) return null;

    try {
      const { data } = await refetch();
      if (data && Array.isArray(data)) {
        setPermissions(data);

        // Also update sessionStorage backup
        try {
          sessionStorage.setItem("permissions-backup", JSON.stringify(data));
        } catch {
          // Silent error
        }

        return data;
      }
      return null;
    } catch (error) {
      console.error("Failed to refresh permissions:", error);
      return null;
    }
  };

  return { refreshPermissions, isLoading };
}
