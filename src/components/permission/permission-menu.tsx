"use client";

import { MenuItemProps } from "@/config/menus/types";
import { usePermissionStore } from "@/store/permission.store";
import { hasMenuPermission } from "@/services/common/permissions/utils";
import { ReactNode, useMemo, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth/logout";

interface PermissionMenuProps {
  menus: MenuItemProps[];
  render: (filteredMenus: MenuItemProps[]) => ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Component that filters menu items based on user permissions
 * Includes security mechanisms to prevent unauthorized access when localStorage is manipulated
 *
 * @param menus The original menu array
 * @param render Render function that receives filtered menus
 * @param loadingFallback Optional loading state component
 */
export function PermissionMenu({
  menus,
  render,
  loadingFallback,
}: PermissionMenuProps) {
  const { permissions, isLoaded } = usePermissionStore();
  const { isAuthenticated, isSessionChecked, active_role } = useAuthStore();
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  // After a short delay, consider initialization complete
  // This prevents flashing of unauthorized content on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 300); // Increased delay to ensure hydration is complete

    return () => clearTimeout(timer);
  }, []);

  // Security check: Handle auth state changes and redirects
  useEffect(() => {
    // Only run security check after initialization and session check
    if (!initializing && isSessionChecked) {
      // Redirect unauthenticated users to login
      if (!isAuthenticated) {
        router.replace("/auth/login");
        return;
      }

      // Security issue: Authenticated but missing permissions
      // This is likely due to localStorage being cleared or manipulated
      if (isAuthenticated && !isLoaded) {
        const handleSecurityViolation = async () => {
          try {
            console.warn(
              "[Permission Menu] Security violation detected: Missing permissions"
            );
            await logout();
          } catch (error) {
            console.error(
              "[Permission Menu] Error handling security violation:",
              error
            );
            // Force a hard refresh as last resort
            window.location.href = "/auth/login?error=security_violation";
          }
        };

        handleSecurityViolation();
      }
    }
  }, [initializing, isAuthenticated, isSessionChecked, isLoaded, router]);

  // Default permission keys for customer users
  const CUSTOMER_DEFAULT_PERMISSIONS = useMemo(
    () => [
      "read-dashboard",
      "read-profile",
      "read-order",
      "read-event",
      "read-menu-choice",
      "read-notification",
      "read-payment-method",
      "read-support",
      "read-wishlist",
    ],
    []
  );

  // Filter menus recursively based on permissions
  const filteredMenus = useMemo(() => {
    // During initialization or auth issues, return empty array
    if (initializing || !isAuthenticated || !isLoaded) return [];

    const filterMenusByPermission = (
      items: MenuItemProps[]
    ): MenuItemProps[] => {
      return items.filter((item) => {
        // For customers, provide fallback permissions when needed
        // This ensures customers always have a usable UI, even if permissions API fails
        const effectivePermissions =
          active_role === "customer" &&
          (!permissions || permissions.length === 0)
            ? CUSTOMER_DEFAULT_PERMISSIONS
            : permissions;

        // Check if user has permission for this menu item
        const hasAccess = hasMenuPermission(
          item.permissions,
          effectivePermissions
        );

        if (!hasAccess) return false;

        // If item has children, filter them too
        if (item.menu && item.menu.length > 0) {
          const filteredChildren = filterMenusByPermission([...item.menu]);
          // Create a new object to avoid mutating the original
          return {
            ...item,
            menu: filteredChildren,
          };
        }

        return true;
      });
    };

    return filterMenusByPermission([...menus]);
  }, [
    initializing,
    isAuthenticated,
    isLoaded,
    menus,
    active_role,
    permissions,
    CUSTOMER_DEFAULT_PERMISSIONS,
  ]);

  // Show loading state during initialization or when permissions are loading
  if (initializing || (isAuthenticated && !isLoaded)) {
    if (loadingFallback) return <>{loadingFallback}</>;

    // Default loading fallback
    return (
      <div className="p-2 space-y-2">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
      </div>
    );
  }

  return <>{render(filteredMenus)}</>;
}
