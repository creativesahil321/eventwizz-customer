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
import { isMenuActive } from "./utils";

interface MenuItemComponentProps {
  menu: MenuItemProps;
}

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
