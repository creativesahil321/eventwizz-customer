import { MenuItemProps } from "@/config/menus/types";

const getPathAndQuery = (
  url: string
): { path: string; query: URLSearchParams } => {
  try {
    if (url.startsWith("http")) {
      const urlObj = new URL(url);
      return {
        path: urlObj.pathname,
        query: new URLSearchParams(urlObj.search),
      };
    }

    const [path, queryString] = url.split("?");
    return {
      path,
      query: new URLSearchParams(queryString || ""),
    };
  } catch {
    return {
      path: url,
      query: new URLSearchParams(),
    };
  }
};

const pathMatches = (pathname: string, menuPath: string): boolean => {
  if (!menuPath) return false;
  return (
    pathname === menuPath ||
    (menuPath.length > 1 && pathname.startsWith(`${menuPath}/`))
  );
};

/** Active when pathname matches href/url exactly or is a nested route under it. */
export const isMenuActive = (
  menu: MenuItemProps,
  pathname: string,
  searchParams?: URLSearchParams
): boolean => {
  const params = searchParams ?? new URLSearchParams();
  const menuHref = menu.href || "";
  const menuUrl = menu.url || "";

  const { path: menuPathFromHref, query: menuQueryFromHref } =
    getPathAndQuery(menuHref);
  const { path: menuPathFromUrl, query: menuQueryFromUrl } =
    getPathAndQuery(menuUrl);

  const matches =
    pathMatches(pathname, menuPathFromHref) ||
    pathMatches(pathname, menuPathFromUrl);

  if (matches) {
    if (menuQueryFromHref.toString() || menuQueryFromUrl.toString()) {
      let queryMatches = true;

      if (menuQueryFromHref.toString()) {
        for (const [key, value] of menuQueryFromHref.entries()) {
          if (params.get(key) !== value) {
            queryMatches = false;
            break;
          }
        }
      }

      if (!queryMatches && menuQueryFromUrl.toString()) {
        queryMatches = true;
        for (const [key, value] of menuQueryFromUrl.entries()) {
          if (params.get(key) !== value) {
            queryMatches = false;
            break;
          }
        }
      }

      if (queryMatches) return true;
    } else if (!params.has("status")) {
      return true;
    }
  }

  return (
    menu.menu?.some((subMenu) => isMenuActive(subMenu, pathname, params)) ??
    false
  );
};
