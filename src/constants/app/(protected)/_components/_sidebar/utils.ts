import { MenuItemProps } from "@/config/menus/types";
import { env } from "@/env";
export const isMenuActive = (menu: MenuItemProps, pathname: string): boolean => {
  const fullUrl = `${env.NEXT_PUBLIC_APP_URL}${pathname}`;
  if (menu.url && fullUrl === menu.url) return true;
  if (menu.href && fullUrl === menu.href) return true;
  return menu.menu?.some((subMenu) => isMenuActive(subMenu, fullUrl)) ?? false;
};
