"use client";

import React, { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { usePermissions } from "@/hooks/usePermission";

export default function DebugPermissionsPage() {
  // Diagnostic page — never expose permission/session internals in production.
  if (process.env.NODE_ENV === "production") notFound();

  const { permissions, isLoaded, isHydrated } = usePermissions();
  const [localStoragePerms, setLocalStoragePerms] =
    useState<string>("Loading...");
  const [sessionStoragePerms, setSessionStoragePerms] =
    useState<string>("Loading...");
  const [sessionData, setSessionData] = useState<string>("Loading...");

  useEffect(() => {
    // Read localStorage and sessionStorage
    if (typeof window !== "undefined") {
      try {
        setLocalStoragePerms(
          localStorage.getItem("permission-storage") || "Not found"
        );
        setSessionStoragePerms(
          sessionStorage.getItem("permissions-backup") || "Not found"
        );

        // Try to get session data
        fetch("/api/auth/session")
          .then((res) => res.json())
          .then((data) => setSessionData(JSON.stringify(data, null, 2)))
          .catch(() => setSessionData("Error loading session"));
      } catch (e) {
        console.error("Error reading storage:", e);
      }
    }
  }, []);

  const refreshData = () => {
    window.location.reload();
  };

  const resetPermissions = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("permission-storage");
        sessionStorage.removeItem("permissions-backup");
        alert("Permissions cleared. Refreshing page...");
        setTimeout(refreshData, 500);
      } catch (e) {
        console.error("Failed to clear permissions:", e);
      }
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Permission Debugging</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-2">Zustand Store</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Status:</span>{" "}
              {isLoaded ? "✅ Loaded" : "❌ Not loaded"} |{" "}
              {isHydrated ? "✅ Hydrated" : "❌ Not hydrated"}
            </div>
            <div>
              <span className="font-medium">Permissions Count:</span>{" "}
              {permissions.length}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-medium mb-2">Permissions List:</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-80">
              {JSON.stringify(permissions, null, 2)}
            </pre>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-2">
            Local & Session Storage
          </h2>

          <div className="mb-4">
            <h3 className="font-medium mb-1">
              &quot;permission-storage&quot;:
            </h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
              {localStoragePerms}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-1">
              &quot;permissions-backup&quot;:
            </h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
              {sessionStoragePerms}
            </pre>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-2">NextAuth Session</h2>
        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-80">
          {sessionData}
        </pre>
      </div>

      <div className="mt-6 flex space-x-4">
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Data
        </button>
        <button
          onClick={resetPermissions}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reset Permissions
        </button>
      </div>
    </div>
  );
}
