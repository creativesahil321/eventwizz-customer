import { vendorMenus } from "./vendor-menus";

export type FirstAccessibleVendorOptions = {
  /** Paths to skip (e.g. exclude dashboard when redirecting away from it). */
  excludePaths?: readonly string[];
};

/**
 * First vendor sidebar route the user is allowed to open, in menu order.
 * Uses the same `permissions` string as each item in `vendorMenus`.
 */
export function getFirstAccessibleVendorPath(
  permissions: readonly string[] | null | undefined,
  options?: FirstAccessibleVendorOptions,
): string {
  const granted = new Set(permissions ?? []);
  const exclude = new Set(options?.excludePaths ?? []);

  for (const item of vendorMenus) {
    const path = item.href ?? item.url;
    if (!path || exclude.has(path)) continue;
    const key = item.permissions?.trim();
    if (!key || granted.has(key)) return path;
  }

  return "/unauthorized";
}
