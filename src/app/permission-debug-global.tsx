"use client";

import { useState } from "react";
import { usePermissionStore } from "@/store/permission.store";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function PermissionDebugGlobal() {
  const [expanded, setExpanded] = useState(false);
  const { permissions, isLoaded } = usePermissionStore();
  const { status } = useSession();

  // Hide when not authenticated
  if (status !== "authenticated") return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-amber-600 hover:bg-amber-700 text-black font-bold py-2 px-4 rounded shadow-lg text-xs"
      >
        {permissions.length} Permissions {expanded ? "▲" : "▼"}
      </button>

      {expanded && (
        <div className="mt-2 p-4 bg-white rounded shadow-xl border border-gray-300 max-h-96 overflow-auto w-96">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-black">Permission Debug</h3>
            <Link
              href="/vendor/permissions-debug"
              className="text-blue-600 hover:underline text-sm"
            >
              Full Debug Page →
            </Link>
          </div>

          <div className="text-xs mb-2">
            <span className={isLoaded ? "text-green-600" : "text-amber-600"}>
              {isLoaded ? "✓ Permissions Loaded" : "⚠ Permissions Loading..."}
            </span>
          </div>

          <div className="mb-3 text-xs text-gray-500">
            You have {permissions.length} permissions from the API.
          </div>

          <div className="border-t pt-2 mt-2">
            <div className="max-h-40 overflow-y-auto space-y-1">
              {permissions.map((permission, idx) => (
                <div key={idx} className="text-xs font-mono text-black">
                  {permission}
                </div>
              ))}
              {permissions.length === 0 && (
                <div className="text-xs text-gray-500 italic">
                  No permissions found
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
            If menu items aren&apos;t showing, check that your permissions match
            the required format.
          </div>
        </div>
      )}
    </div>
  );
}
