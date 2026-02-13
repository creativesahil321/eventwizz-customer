"use client";

import { useEffect, useState } from "react";
import { usePermissionStore } from "@/store/permission.store";
import { vendorMenus } from "@/config/menus/vendor-menus";
import { useMenuPermission } from "@/components/permission/use-menu-permission";
import { mapMenuPermissionToAPI } from "@/services/common/permissions/utils";
import { MenuItemProps } from "@/config/menus/types";
import { env } from "@/env";

interface PermissionItem {
  title: string;
  permission: string;
  apiFormat: string;
  hasAccess: boolean;
}
export default function PermissionDebug() {
  const [expanded, setExpanded] = useState(false);
  const { permissions } = usePermissionStore();
  const { checkMenuPermission } = useMenuPermission();
  const [menuPermissions, setMenuPermissions] = useState<PermissionItem[]>([]);

  // When permissions change, update menu permission checks
  useEffect(() => {
    // Skip work in non-development environments
    if (env.NEXT_PUBLIC_NODE_ENV !== "development") {
      return;
    }

    // Extract all menu permissions
    const extractPermissions = (menus: MenuItemProps[]): PermissionItem[] => {
      return menus.flatMap((menu) => {
        const permissions: PermissionItem[] = [];
        if (menu.permissions) {
          permissions.push({
            title: menu.title,
            permission: menu.permissions,
            apiFormat: mapMenuPermissionToAPI(menu.permissions),
            hasAccess: checkMenuPermission(menu.permissions),
          });
        }
        if (menu.menu && menu.menu.length) {
          const childPermissions = extractPermissions(menu.menu);
          permissions.push(...childPermissions);
        }
        return permissions;
      });
    };

    const allMenuPermissions = extractPermissions(vendorMenus);

    // Check each permission
    const permissionChecks = allMenuPermissions.map((item) => ({
      title: item.title,
      permission: item.permission,
      apiFormat: mapMenuPermissionToAPI(item.permission),
      hasAccess: checkMenuPermission(item.permission),
    }));

    setMenuPermissions(permissionChecks);
  }, [permissions, checkMenuPermission]);

  // Only render in development mode
  if (env.NEXT_PUBLIC_NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="rounded bg-amber-600 px-3 py-1.5 text-xs font-bold text-black shadow-lg hover:bg-amber-700 sm:px-4 sm:py-2 sm:text-sm"
      >
        Permission Debug {expanded ? "▲" : "▼"}
      </button>

      {expanded && (
        <div className="mt-2 p-4 bg-white rounded shadow-xl border border-gray-300 max-h-96 overflow-auto">
          <h3 className="font-bold mb-2">
            Your Permissions ({permissions.length})
          </h3>
          <div className="mb-4 space-y-1">
            {permissions.map((permission, idx) => (
              <div key={idx} className="text-sm font-mono">
                {permission}
              </div>
            ))}
          </div>

          <h3 className="font-bold mb-2 mt-4">Menu Permission Mapping</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Menu</th>
                <th className="text-left py-1">Permission Key</th>
                <th className="text-left py-1">API Format</th>
                <th className="text-left py-1">Access</th>
              </tr>
            </thead>
            <tbody>
              {menuPermissions.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-1">{item.title}</td>
                  <td className="py-1 font-mono">{item.permission}</td>
                  <td className="py-1 font-mono">{item.apiFormat}</td>
                  <td
                    className={`py-1 ${
                      item.hasAccess
                        ? "text-green-600 font-bold"
                        : "text-red-600"
                    }`}
                  >
                    {item.hasAccess ? "✓" : "✗"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
