"use client";

import { MenuItemProps } from "@/config/menus/types";
import { usePermissionStore } from "@/store/permission.store";
import { hasMenuPermission } from "@/services/common/permissions/utils";
import { ReactNode, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth.store";

interface PermissionMenuProps {
  menus: MenuItemProps[];
  render: (filteredMenus: MenuItemProps[]) => ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Filters menu items by the user's permissions. Auth redirects and the
 * "permissions never loaded" logout live in PageWrapper, which wraps every
 * protected page — this component only renders.
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
  const { isAuthenticated, active_role, account_type } = useAuthStore();
  const isCustomer =
    account_type === "customer" ||
    active_role === "customer" ||
    active_role === "Customer";

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
