"use client";

import { usePermissionStore } from "@/store/permission.store";
import {
  mapMenuPermissionToAPI,
  hasMenuPermission,
  hasAnyMenuPermission,
} from "@/services/common/permissions/utils";
import { useMemo } from "react";
import { useAuthStore } from "@/store/auth.store";

/**
 * Custom hook for checking menu permissions
 * This hook provides functions to check if a user has permission to access menu items
 */
export function useMenuPermission() {
  const { permissions, isLoaded } = usePermissionStore();
  const { isAuthenticated } = useAuthStore();

  // Memoize check functions to avoid recreating them on each render
  const checkMenuPermission = useMemo(() => {
    return (menuPermission: string | undefined): boolean => {
      // If no specific permission is required
      if (!menuPermission) return true;

      // If user is not authenticated, don't check permissions
      if (!isAuthenticated) return true;

      // If permissions aren't loaded yet
      if (!isLoaded || !permissions.length) return false;

      return hasMenuPermission(menuPermission, permissions);
    };
  }, [permissions, isLoaded, isAuthenticated]);

  // Function for checking any of multiple permissions
  const checkAnyMenuPermission = useMemo(() => {
    return (menuPermission: string | undefined): boolean => {
      // If no specific permission is required
      if (!menuPermission) return true;

      // If user is not authenticated, don't check permissions
      if (!isAuthenticated) return true;

      // If permissions aren't loaded yet
      if (!isLoaded || !permissions.length) return false;

      return hasAnyMenuPermission(menuPermission, permissions);
    };
  }, [permissions, isLoaded, isAuthenticated]);

  // Function for mapping menu permission to API format (for debugging)
  const getApiPermission = useMemo(() => {
    return (menuPermission: string | undefined): string => {
      return mapMenuPermissionToAPI(menuPermission);
    };
  }, []);

  return {
    checkMenuPermission,
    checkAnyMenuPermission,
    getApiPermission,
    isLoaded,
    hasPermissions: isLoaded && permissions.length > 0,
  };
}
