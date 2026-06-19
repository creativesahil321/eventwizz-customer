"use client";

import React, { useState } from "react";
import { usePermissionStore } from "@/store/permission.store";
import { vendorMenus } from "@/config/menus/vendor-menus";
import { generatePermissionDebugInfo } from "@/services/common/permissions/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Import the debug info type or define it here
interface PermissionDebugInfo {
  id: number | string;
  title: string;
  menuPermission: string | undefined;
  apiPermission: string;
  hasPermission: boolean;
  children?: PermissionDebugInfo[];
}

interface MenuPermissionDebugProps {
  showFull?: boolean;
}

export function PermissionMenuDebug({
  showFull = false,
}: MenuPermissionDebugProps) {
  const { permissions } = usePermissionStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!permissions.length) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-amber-700">No permissions loaded yet.</p>
      </div>
    );
  }

  const debugInfo = generatePermissionDebugInfo(vendorMenus, permissions);

  // Filter to show only items with issues if not showing full list
  const filteredItems = showFull
    ? debugInfo
    : debugInfo.filter((item) => !item.hasPermission);

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-amber-900">Menu Permission Debug</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded text-amber-900"
        >
          {isExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      <div className="text-xs mb-4 text-amber-800">
        {filteredItems.length === 0 ? (
          <p>All menu items have correct permissions! 🎉</p>
        ) : (
          <p>Found {filteredItems.length} menu items with permission issues:</p>
        )}
      </div>

      <Accordion
        type="multiple"
        defaultValue={
          isExpanded ? filteredItems.map((i) => i.id.toString()) : []
        }
      >
        {filteredItems.map((item) => (
          <AccordionItem key={item.id} value={item.id.toString()}>
            <AccordionTrigger
              className={`text-sm ${
                item.hasPermission ? "text-green-700" : "text-red-700"
              }`}
            >
              {item.title}
              {item.hasPermission ? " ✅" : " ❌"}
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-4 pt-2 space-y-1">
                <p>
                  <span className="font-medium">Menu Permission:</span>{" "}
                  {item.menuPermission || "None"}
                </p>
                <p>
                  <span className="font-medium">API Permission:</span>{" "}
                  {item.apiPermission}
                </p>
                <p>
                  <span className="font-medium">Has Permission:</span>{" "}
                  {item.hasPermission ? "Yes" : "No"}
                </p>

                {/* Check which API permissions are available */}
                {item.menuPermission && (
                  <div className="mt-2">
                    <p className="font-medium">Related API Permissions:</p>
                    <ul className="pl-4 list-disc">
                      {permissions
                        .filter((p) =>
                          p.includes(item.apiPermission.split("-")[1])
                        )
                        .map((p) => (
                          <li key={p} className="text-green-700">
                            {p}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Show children if any */}
                {item.children && item.children.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Sub-menu items:</p>
                    <ul className="pl-4">
                      {item.children.map((child: PermissionDebugInfo) => (
                        <li
                          key={child.id}
                          className={
                            child.hasPermission
                              ? "text-green-700"
                              : "text-red-700"
                          }
                        >
                          {child.title}: {child.menuPermission} →{" "}
                          {child.apiPermission}
                          {child.hasPermission ? " ✅" : " ❌"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Show available API permissions */}
      <div className="mt-4 pt-4 border-t border-amber-200">
        <details>
          <summary className="cursor-pointer font-medium text-sm">
            Your API Permissions ({permissions.length})
          </summary>
          <div className="mt-2 max-h-40 overflow-y-auto pl-4">
            <ul className="list-disc">
              {permissions.map((p) => (
                <li key={p} className="text-xs">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}
