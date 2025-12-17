"use client";

import React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import {
  usePermission,
  useAnyPermission,
  useAllPermissions,
} from "@/hooks/usePermission";

// Define button props type based on the actual Button component implementation
type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

interface PermissionButtonBaseProps extends ButtonProps {
  hideOnNoPermission?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}

interface SinglePermissionButtonProps extends PermissionButtonBaseProps {
  permissionKey: string;
  anyPermission?: never;
  allPermissions?: never;
}

interface AnyPermissionButtonProps extends PermissionButtonBaseProps {
  permissionKey?: never;
  anyPermission: string[];
  allPermissions?: never;
}

interface AllPermissionsButtonProps extends PermissionButtonBaseProps {
  permissionKey?: never;
  anyPermission?: never;
  allPermissions: string[];
}

type PermissionButtonProps =
  | SinglePermissionButtonProps
  | AnyPermissionButtonProps
  | AllPermissionsButtonProps;

/**
 * A button that is automatically disabled or hidden if the user doesn't have the required permission(s)
 */
export function PermissionButton({
  hideOnNoPermission = false,
  children,
  permissionKey,
  anyPermission,
  allPermissions,
  disabled = false,
  ...rest
}: PermissionButtonProps) {
  // Always call hooks at the top level
  const hasPermissionKey = usePermission(permissionKey || "");
  const hasAnyPermission = useAnyPermission(anyPermission || []);
  const hasAllPermissions = useAllPermissions(allPermissions || []);

  // Determine if user has permission based on which props were provided
  let hasPermission = true;
  if (permissionKey) {
    hasPermission = hasPermissionKey;
  } else if (anyPermission) {
    hasPermission = hasAnyPermission;
  } else if (allPermissions) {
    hasPermission = hasAllPermissions;
  }

  if (!hasPermission && hideOnNoPermission) {
    return null;
  }

  return (
    <Button
      className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text)] border-[var(--color-primary)] hover:scale-[1.03] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
      {...rest}
      disabled={!hasPermission || disabled}
    >
      {children}
    </Button>
  );
}
