"use client";

import React, { ReactNode, useEffect } from "react";
import {
  usePermission,
  useAnyPermission,
  usePermissions,
} from "@/hooks/usePermission";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth.store";
import { getLogoutInProgress } from "@/services/core/api-client";

type PermissionRouteProps = {
  children: ReactNode;
  permissionKey?: string;
  anyPermission?: string[];
  fallbackPath?: string;
  showLoader?: boolean;
};

/**
 * Component that protects routes based on permissions
 * If user doesn't have permission, they are redirected to the fallback path
 */
export function PermissionRoute({
  children,
  permissionKey,
  anyPermission,
  fallbackPath = "/unauthorized",
  showLoader = true,
}: PermissionRouteProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  // Permissions are loaded from the API into the store (not the JWT), so they
  // can arrive a moment after the session. We must NOT decide access until they
  // have resolved, or a vendor gets bounced to the fallback right after login.
  const { isLoaded: permissionsLoaded } = usePermissions();

  // Handle different permission check types
  // Always call hooks to follow Rules of Hooks
  // For conditional permission checks, we call hooks with safe defaults
  // and only apply the results when the conditions are actually specified
  const specificPermissionResult = usePermission(permissionKey || "");
  const anyPermissionResult = useAnyPermission(anyPermission || []);
  
  // Apply conditional logic after hook calls
  // - If no permissionKey provided, assume permission is granted
  // - If no anyPermission provided, assume permission is granted
  // - If permissionKey provided, use the actual result
  // - If anyPermission provided (even if empty), use the actual result
  const hasSpecificPermission = !permissionKey || specificPermissionResult;
  const hasAnyOfPermissions = !anyPermission || anyPermissionResult;

  // Combine checks - user needs to pass all provided checks
  const hasPermission = hasSpecificPermission && hasAnyOfPermissions;

  useEffect(() => {
    // Wait until permissions have actually loaded before deciding — otherwise
    // we'd redirect during the brief API-load window after login.
    if (!permissionsLoaded || hasPermission) return;

    // Small delay to allow for hydration to complete
    const timer = setTimeout(() => {
      // Only redirect to the fallback when the user is authenticated but truly
      // lacks permission. If they are logging out (isAuthenticated just became
      // false OR logout is actively in progress), the auth guard / PageWrapper
      // will handle the redirect to /auth/login — we must NOT race it with a
      // redirect to /unauthorized, which causes the flash screen.
      if (!hasPermission && isAuthenticated && !getLogoutInProgress()) {
        router.replace(fallbackPath);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [hasPermission, isAuthenticated, router, fallbackPath, permissionsLoaded]);

  // Permission is satisfied (or none required) — render immediately.
  if (hasPermission) {
    return <>{children}</>;
  }

  // Show loader while the user is authenticated but permissions are still
  // resolving, or are resolved-but-insufficient (just before redirect). Skip
  // during logout to avoid a skeleton flash before the login redirect takes over.
  if (showLoader && isAuthenticated && !getLogoutInProgress()) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
