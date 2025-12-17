"use client";

import React, { ReactNode, useEffect } from "react";
import { usePermission, useAnyPermission } from "@/hooks/usePermission";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

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
    // Small delay to allow for hydration to complete
    const timer = setTimeout(() => {
      if (!hasPermission) {
        router.replace(fallbackPath);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [hasPermission, router, fallbackPath]);

  // Show loader while checking permissions
  if (showLoader && !hasPermission) {
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
