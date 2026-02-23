"use client";

import React, { memo, useState, useCallback, useMemo } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { MenuItemProps } from "@/config/menus/types";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useDomainStore } from "@/store/domain.store";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";
import { useMenuPermission } from "@/components/permission/use-menu-permission";
import { useAuthStore } from "@/store/auth.store";

interface MenuItemComponentProps {
  menu: MenuItemProps;
}

// Check if a menu item is active by comparing pathnames and query parameters
const isMenuActive = (
  menu: MenuItemProps,
  pathname: string,
  searchParams: URLSearchParams
): boolean => {
  // Extract path and query from menu URLs
  const getPathAndQuery = (
    url: string
  ): { path: string; query: URLSearchParams } => {
    try {
      // If it's a full URL, extract the pathname and search params
      if (url.startsWith("http")) {
        const urlObj = new URL(url);
        return {
          path: urlObj.pathname,
          query: new URLSearchParams(urlObj.search),
        };
      }

      // Handle relative URLs with query params
      const [path, queryString] = url.split("?");
      return {
        path,
        query: new URLSearchParams(queryString || ""),
      };
    } catch {
      // If URL parsing fails, return the original string as path with empty query
      return {
        path: url,
        query: new URLSearchParams(),
      };
    }
  };

  // Get paths and queries to compare
  const menuHref = menu.href || "";
  const menuUrl = menu.url || "";

  const { path: menuPathFromHref, query: menuQueryFromHref } =
    getPathAndQuery(menuHref);
  const { path: menuPathFromUrl, query: menuQueryFromUrl } =
    getPathAndQuery(menuUrl);

  // Check for exact path match first
  const pathMatches =
    pathname === menuPathFromHref || pathname === menuPathFromUrl;

  // If path matches, check query parameters
  if (pathMatches) {
    // For menu items with query parameters (like status filters)
    if (menuQueryFromHref.toString() || menuQueryFromUrl.toString()) {
      // Check if all menu query parameters are present in current URL
      let queryMatches = true;

      // Check href query params
      if (menuQueryFromHref.toString()) {
        for (const [key, value] of menuQueryFromHref.entries()) {
          if (searchParams.get(key) !== value) {
            queryMatches = false;
            break;
          }
        }
      }

      // Check url query params if href didn't match
      if (!queryMatches && menuQueryFromUrl.toString()) {
        queryMatches = true; // Reset for url check
        for (const [key, value] of menuQueryFromUrl.entries()) {
          if (searchParams.get(key) !== value) {
            queryMatches = false;
            break;
          }
        }
      }

      if (queryMatches) return true;
    } else {
      // For menu items without query parameters, a path match is sufficient
      // But only if the current URL also doesn't have significant query params
      // For tabs like "All Customers" that should only be active when no status filter is applied
      if (!searchParams.has("status")) {
        return true;
      }
    }
  }

  // Finally check children recursively
  return (
    menu.menu?.some((subMenu) =>
      isMenuActive(subMenu, pathname, searchParams)
    ) ?? false
  );
};

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({ menu }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { sidebarCollapsed: collapsed } = useDomainStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = isMenuActive(menu, pathname, searchParams);
  const { checkMenuPermission } = useMenuPermission();
  const { isAuthenticated, account_type } = useAuthStore();
  const isCustomer = account_type === "customer";

  // Customers do not use permissions; always show. Otherwise check permission.
  const hasPermission =
    !isAuthenticated ||
    isCustomer ||
    checkMenuPermission(menu.permissions);

  const hasChildren = useMemo(
    () => Boolean(menu.menu && menu.menu.length > 0),
    [menu.menu]
  );
  const Icon = useMemo(
    () => (menu.icon ? Icons[menu.icon as keyof typeof Icons] : null),
    [menu.icon]
  );
  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);
  const asChild = useMemo(() => !hasChildren, [hasChildren]);
  const href = useMemo(() => menu.href || "#", [menu.href]);
  const isChild = Boolean(menu.isChild);

  const containerClass = useMemo(
    () =>
      `flex items-center w-full ${
        collapsed ? "justify-center" : "justify-between"
      }`,
    [collapsed]
  );
  const iconClass = useMemo(
    () =>
      `transition-all duration-200 size-${collapsed ? 5 : 4} ${
        collapsed ? "me-0" : "me-4"
      } ${
        isActive
          ? "text-[var(--color-primary-foreground,white)]"
          : "text-black"
      }`,
    [collapsed, isActive]
  );
  const chevronClass = useMemo(
    () =>
      `transition-transform ${isOpen ? "rotate-90" : ""} ${
        isActive
          ? "text-[var(--color-primary-foreground,white)]"
          : "text-black"
      }`,
    [isOpen, isActive]
  );

  // If user doesn't have permission, don't render this menu item
  if (!hasPermission) return null;

  return (
    <li
      className={cn("w-full", isActive && "active")}
      data-pathname={pathname}
      data-active={isActive}
      data-children={hasChildren}
      data-href={href}
    >
      <Button
        className={cn(
          "w-full dark:bg-transparent border-0 shadow-none bg-transparent relative cursor-pointer flex justify-between items-center",
          isChild ? "h-10" : "h-12",
          isActive
            ? "bg-[var(--color-primary)] rounded-1 text-[var(--color-primary-foreground,white)] hover:bg-[var(--color-primary-hover,var(--color-primary))]"
            : "hover:bg-muted text-black"
        )}
        variant="outline"
        onClick={hasChildren && !collapsed ? toggleOpen : undefined}
        asChild={asChild}
      >
        {asChild ? (
          <Link href={href}>
            <div className={containerClass}>
              <div className="flex items-center">
                {Icon && <Icon className={iconClass} />}
                {!collapsed && (
                  <p className="max-w-[150px] truncate">{menu.title}</p>
                )}
              </div>
              {hasChildren && !collapsed && (
                <ChevronRight size={16} className={chevronClass} />
              )}
            </div>
          </Link>
        ) : (
          <div className={containerClass}>
            <div className="flex items-center">
              {Icon && <Icon className={iconClass} />}
              {!collapsed && (
                <p className="max-w-[150px] truncate">{menu.title}</p>
              )}
            </div>
            {hasChildren && !collapsed && (
              <ChevronRight size={16} className={chevronClass} />
            )}
          </div>
        )}
      </Button>
      {hasChildren && isOpen && !collapsed && (
        <ul className="ml-8 mt-1 flex flex-col space-y-1">
          {menu.menu!.map((childMenu, idx) => (
            <MemoizedMenuItem
              key={idx}
              menu={{
                ...childMenu,
                isChild: true,
              }}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const MemoizedMenuItem = memo(MenuItemComponent);

export default MemoizedMenuItem;
