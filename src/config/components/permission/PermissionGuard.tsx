"use client";

import React, { ReactNode } from "react";
import {
  usePermission,
  useAnyPermission,
  useAllPermissions,
} from "@/hooks/usePermission";

interface PermissionGuardBaseProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface SinglePermissionProps extends PermissionGuardBaseProps {
  permissionKey: string;
  anyPermission?: never;
  allPermissions?: never;
}

interface AnyPermissionProps extends PermissionGuardBaseProps {
  permissionKey?: never;
  anyPermission: string[];
  allPermissions?: never;
}

interface AllPermissionsProps extends PermissionGuardBaseProps {
  permissionKey?: never;
  anyPermission?: never;
  allPermissions: string[];
}

type PermissionGuardProps =
  | SinglePermissionProps
  | AnyPermissionProps
  | AllPermissionsProps;

/**
 * A component that conditionally renders its children based on user permissions
 * It can check for a single permission, any of multiple permissions, or all of multiple permissions
 */
export function PermissionGuard(props: PermissionGuardProps) {
  const { children, fallback = null } = props;

  // Always call all hooks to follow Rules of Hooks
  // Use safe defaults for hooks that won't be needed
  const singlePermissionResult = usePermission(
    "permissionKey" in props ? props.permissionKey || "" : ""
  );
  const anyPermissionResult = useAnyPermission(
    "anyPermission" in props ? props.anyPermission || [] : []
  );
  const allPermissionsResult = useAllPermissions(
    "allPermissions" in props ? props.allPermissions || [] : []
  );

  // Determine which permission check result to use based on props
  let hasRequiredPermission = true; // Default to true (allow access)

  if ("permissionKey" in props && props.permissionKey) {
    hasRequiredPermission = singlePermissionResult;
  } else if ("anyPermission" in props && props.anyPermission) {
    hasRequiredPermission = anyPermissionResult;
  } else if ("allPermissions" in props && props.allPermissions) {
    hasRequiredPermission = allPermissionsResult;
  }

  // Render fallback if permission check fails
  if (!hasRequiredPermission) {
    return <>{fallback}</>;
  }

  // If we reach here, user has the required permission(s)
  return <>{children}</>;
}
 