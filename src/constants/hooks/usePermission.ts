"use client";

import { usePermissionStore } from "@/store/permission.store";
import { useEffect, useState } from "react";

/**
 * Hook to check if the user has a specific permission
 * @param permissionKey The permission key to check
 * @returns boolean indicating if the user has the permission
 */
export function usePermission(permissionKey: string) {
  const hasPermission = usePermissionStore((state) =>
    state.hasPermission(permissionKey)
  );

  // Track if the permission store has been hydrated client-side
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // We want to be conservative - only return true if hydrated and permission exists
  return isHydrated && hasPermission;
}

/**
 * Hook to check if the user has any of the specified permissions
 * @param permissionKeys Array of permission keys to check
 * @returns boolean indicating if the user has any of the permissions
 */
export function useAnyPermission(permissionKeys: string[]) {
  const hasAnyPermission = usePermissionStore((state) =>
    state.hasAnyPermission(permissionKeys)
  );

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated && hasAnyPermission;
}

/**
 * Hook to check if the user has all of the specified permissions
 * @param permissionKeys Array of permission keys to check
 * @returns boolean indicating if the user has all of the permissions
 */
export function useAllPermissions(permissionKeys: string[]) {
  const hasAllPermissions = usePermissionStore((state) =>
    state.hasAllPermissions(permissionKeys)
  );

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated && hasAllPermissions;
}

/**
 * Hook to get all permissions and loading state
 * @returns Object containing permissions array and isLoaded state
 */
export function usePermissions() {
  const permissions = usePermissionStore((state) => state.permissions);
  const isLoaded = usePermissionStore((state) => state.isLoaded);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return {
    permissions,
    isLoaded: isHydrated && isLoaded,
    isHydrated,
  };
}
