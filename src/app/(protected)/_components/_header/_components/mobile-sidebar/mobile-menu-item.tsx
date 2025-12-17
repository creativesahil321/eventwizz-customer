import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { MenuItemProps } from "@/config/menus/types";
import { env } from "@/env";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { memo } from "react";

const isMenuActive = (menu: MenuItemProps, pathname: string): boolean => {
  const fullUrl = `${env.NEXT_PUBLIC_APP_URL}${pathname}`;
  if (menu.url && fullUrl === menu.url) return true;
  if (menu.href && fullUrl === menu.href) return true;
  return menu.menu?.some((subMenu) => isMenuActive(subMenu, fullUrl)) ?? false;
};

interface MobileMenuItemProps {
  menu: MenuItemProps;
  onClose?: () => void;
}
const MobileMenuItem: React.FC<MobileMenuItemProps> = memo(
  ({ menu, onClose }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const pathname = usePathname();

    const hasChildren = Boolean(menu.menu && menu.menu.length > 0);
    const Icon = menu.icon ? Icons[menu.icon as keyof typeof Icons] : null;
    const href = menu.href || "#";
    const isActive = isMenuActive(menu, pathname);
    const capitalizedTitle =
      menu.title.charAt(0).toUpperCase() + menu.title.slice(1);

    return (
      <li className={cn("w-full", isActive && "active")}>
        <Button
          className={cn(
            "wieurs",
            "w-full dark:bg-transparent border-0 shadow-none bg-transparent relative cursor-pointer flex justify-between items-center h-12",
            isActive
              ? "bg-[var(--color-primary)] rounded-1 !text-background hover:bg-[var(--color-primary)]"
              : "hover:bg-muted"
          )}
          variant="outline"
          onClick={hasChildren ? () => setIsOpen(!isOpen) : undefined}
          asChild={!hasChildren}
        >
          {hasChildren ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                {Icon && <Icon className="size-4 me-4" />}
                <p className="max-w-[150px] truncate">{capitalizedTitle}</p>
              </div>
              <ChevronDown
                size={16}
                className={cn(
                  "transition-transform",
                  isOpen ? "rotate-180" : ""
                )}
              />
            </div>
          ) : (
            <Link href={href} onClick={onClose}>
              <div className="flex items-center">
                {Icon && <Icon className="size-4 me-4" />}
                <p className="max-w-[150px] truncate">{capitalizedTitle}</p>
              </div>
            </Link>
          )}
        </Button>
        {hasChildren && isOpen && (
          <ul className="ml-8 mt-1 flex flex-col space-y-1">
            {menu.menu!.map((childMenu, idx) => (
              <MobileMenuItem
                key={idx}
                menu={{
                  ...childMenu,
                  isChild: true,
                }}
                onClose={onClose}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }
);

MobileMenuItem.displayName = "MobileMenuItem";
export default MobileMenuItem;
