"use client";

import { MenuItemProps } from "@/config/menus/types";
import { usePermissionStore } from "@/store/permission.store";
import { hasMenuPermission } from "@/services/common/permissions/utils";
import { ReactNode, useMemo, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth.store";
import { usePathname, useRouter } from "next/navigation";
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
  const { isAuthenticated, isSessionChecked, active_role, account_type } =
    useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isDoorScan = pathname?.startsWith("/vendor/door-scan");
  const isCustomer =
    account_type === "customer" ||
    active_role === "customer" ||
    active_role === "Customer";

  // Security check: Handle auth state changes and redirects (customers skip permission requirement)
  useEffect(() => {
    if (!isSessionChecked) return;
    if (isDoorScan) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (isCustomer) return;

    if (isAuthenticated && !isLoaded) {
      const handleSecurityViolation = async () => {
        try {
          console.warn(
            "[Permission Menu] Security violation detected: Missing permissions",
          );
          await logout();
        } catch (error) {
          console.error(
            "[Permission Menu] Error handling security violation:",
            error,
          );
          window.location.href = "/auth/login?error=security_violation";
        }
      };
      handleSecurityViolation();
    }
  }, [
    isAuthenticated,
    isSessionChecked,
    isLoaded,
    isCustomer,
    isDoorScan,
    router,
  ]);

  // Customers: no roles/permissions – show all menus immediately, no loading
  const filteredMenus = useMemo(() => {
    if (!isAuthenticated) return [];

    if (isCustomer) return [...menus];

    if (!isLoaded) return [];

    const filterMenusByPermission = (
      items: MenuItemProps[],
    ): MenuItemProps[] => {
      return items.filter((item) => {
        const hasAccess = hasMenuPermission(item.permissions, permissions);
        if (!hasAccess) return false;
        if (item.menu && item.menu.length > 0) {
          const filteredChildren = filterMenusByPermission([...item.menu]);
          return { ...item, menu: filteredChildren };
        }
        return true;
      });
    };
    return filterMenusByPermission([...menus]);
  }, [isAuthenticated, isLoaded, isCustomer, menus, permissions]);

  // Show loading only for non-customer when permissions are loading
  if (isAuthenticated && !isCustomer && !isLoaded) {
    if (loadingFallback) return <>{loadingFallback}</>;
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
