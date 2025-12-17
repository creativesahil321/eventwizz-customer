import { MenuItemProps } from "@/config/menus/types";

/**
 * Maps menu permission format to API permission format
 * @param menuPermission The permission string in menu format (e.g., "resource.action")
 * @returns The permission string in API format (e.g., "action-resource")
 */
export const mapMenuPermissionToAPI = (
  menuPermission: string | undefined
): string => {
  if (!menuPermission) return "";

  // Check if it's already in API format
  if (menuPermission.includes("-")) {
    return menuPermission;
  }

  // Convert "resource.action" to "action-resource"
  const [resource, action] = menuPermission.split(".");

  // Handle edge cases
  if (!resource || !action) return menuPermission;

  // Remove trailing 's' for pluralized resources (events -> event)
  const singularResource = resource.endsWith("s")
    ? resource.slice(0, -1)
    : resource;

  // Handle special cases for resources ending with 'ies'
  const normalizedResource = resource.endsWith("ies")
    ? resource.replace(/ies$/, "y")
    : singularResource;

  return `${action}-${normalizedResource}`;
};

/**
 * Advanced permission checking that handles various formats and edge cases
 *
 * @param menuPermission The permission string in menu format
 * @param permissions Array of user permissions in API format
 * @returns Boolean indicating if the user has the required permission
 */
export const hasMenuPermission = (
  menuPermission: string | undefined,
  permissions: string[]
): boolean => {
  if (!menuPermission) return true; // No permission required
  if (!permissions || !Array.isArray(permissions)) return false;

  // Direct match check first (in case menu permission is already in API format)
  if (permissions.includes(menuPermission)) {
    return true;
  }

  // Handle resource.action format
  if (menuPermission.includes(".")) {
    const [resource, action] = menuPermission.split(".");

    // Try different variations of the resource name
    const resourceVariations = [
      resource, // Exact match (events)
      resource.endsWith("s") ? resource.slice(0, -1) : resource, // Singular (event)
      resource.endsWith("ies") ? resource.replace(/ies$/, "y") : resource, // Plurals like categories->category
    ];

    // Special case for email-template vs email
    if (resource === "email") {
      resourceVariations.push("email-template");
    }

    // Special case for roles vs role-permissions
    if (resource === "roles") {
      resourceVariations.push("role-permissions");
    }

    // Try all possible combinations of action + resource variations
    for (const res of resourceVariations) {
      const permToCheck = `${action}-${res}`;
      if (permissions.includes(permToCheck)) {
        return true;
      }

      // Handle variations in action naming (read vs view, update vs edit)
      if (action === "read" && permissions.includes(`view-${res}`)) {
        return true;
      }
      if (action === "update" && permissions.includes(`edit-${res}`)) {
        return true;
      }
    }

    // Check for broader permissions that might grant access
    if (action === "read" || action === "view") {
      for (const res of resourceVariations) {
        // If user has any higher permission for this resource, they should have read access
        for (const higherAction of [
          "create",
          "update",
          "edit",
          "delete",
          "manage",
          "admin",
        ]) {
          if (permissions.includes(`${higherAction}-${res}`)) {
            return true;
          }
        }
      }
    }
  }

  // If we get here, no permission match was found
  return false;
};

/**
 * Special handling for menu items that might require multiple permissions
 * @param menuPermission The permission string that might contain multiple permissions
 * @param permissions Array of user permissions
 * @returns Boolean indicating if the user has at least one of the required permissions
 */
export const hasAnyMenuPermission = (
  menuPermission: string | undefined,
  permissions: string[]
): boolean => {
  if (!menuPermission) return true;
  if (!permissions || !Array.isArray(permissions)) return false;

  // Check if it's a comma-separated list of permissions
  if (menuPermission.includes(",")) {
    const permissionList = menuPermission.split(",").map((p) => p.trim());
    return permissionList.some((perm) => hasMenuPermission(perm, permissions));
  }

  return hasMenuPermission(menuPermission, permissions);
};

/**
 * Debug function to check permission mapping
 * @param menuPermission The menu permission string
 * @param permissions The user's permissions array
 * @returns Debug information as a string
 */
export const debugPermissionMapping = (
  menuPermission: string | undefined,
  permissions: string[]
): string => {
  if (!menuPermission) return "No permission required";

  const apiFormat = mapMenuPermissionToAPI(menuPermission);
  const hasPermission = hasMenuPermission(menuPermission, permissions);

  return `Menu format: "${menuPermission}" → API format: "${apiFormat}" → ${
    hasPermission ? "✅ Granted" : "❌ Denied"
  }`;
};

// Define a more specific return type for generatePermissionDebugInfo
interface PermissionDebugInfo {
  id: number | string;
  title: string;
  menuPermission: string | undefined;
  apiPermission: string;
  hasPermission: boolean;
  children?: PermissionDebugInfo[];
}

/**
 * Creates a debug list of all menu permissions and their status
 * @param menuItems Menu items array to check
 * @param permissions User permissions array
 * @returns Object with permission check results
 */
export const generatePermissionDebugInfo = (
  menuItems: MenuItemProps[],
  permissions: string[]
): PermissionDebugInfo[] => {
  return menuItems.map((item) => ({
    id: item.id,
    title: item.title,
    menuPermission: item.permissions,
    apiPermission: mapMenuPermissionToAPI(item.permissions),
    hasPermission: hasMenuPermission(item.permissions, permissions),
    // Include children if any
    children: item.menu?.length
      ? generatePermissionDebugInfo(item.menu, permissions)
      : undefined,
  }));
};
