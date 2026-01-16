"use client";

// import {
//   usePermissionStore,
//   getPermissionStatus,
// } from "@/store/permission.store";
// import {
//   useLoadPermissions,
//   useRefreshPermissions,
// } from "@/services/common/permissions/hooks";
// import { Button } from "@/components/ui/button";

/**
 * Debug component to demonstrate the permission system fallback mechanism
 * This component is not meant for production use
 */
export function PermissionDebug() {
  // Commented out to hide the debug component
  return null;

  // const { permissions } = usePermissionStore();
  // const status = getPermissionStatus();
  // const { isLoading } = useLoadPermissions();
  // const { refreshPermissions, isLoading: isRefreshing } =
  //   useRefreshPermissions();

  // const clearPermissionStorage = () => {
  //   try {
  //     localStorage.removeItem("permission-storage");
  //     sessionStorage.removeItem("permissions-backup");
  //     window.location.reload();
  //   } catch (e) {
  //     console.error("Failed to clear permission storage:", e);
  //   }
  // };

  // return (
  //   <div className="p-4 border rounded-md my-4 bg-gray-50 text-black">
  //     <h2 className="text-lg font-semibold mb-2">Permission System Debug</h2>

  //     <div className="mb-4">
  //       <p>
  //         <strong>Status:</strong> {status.isLoaded ? "Loaded" : "Not Loaded"}
  //       </p>
  //       <p>
  //         <strong>Permission Count:</strong> {status.permissionCount}
  //       </p>
  //       <p>
  //         <strong>Loading State:</strong> {isLoading ? "Loading..." : "Ready"}
  //       </p>
  //     </div>

  //     <div className="mb-4">
  //       <h3 className="font-medium mb-1">Current Permissions:</h3>
  //       {permissions.length > 0 ? (
  //         <ul className="list-disc pl-5 text-sm max-h-40 overflow-y-auto">
  //           {permissions.map((perm) => (
  //             <li key={perm}>{perm}</li>
  //           ))}
  //         </ul>
  //       ) : (
  //         <p className="text-gray-500 italic">No permissions loaded</p>
  //       )}
  //     </div>

  //     <div className="flex gap-3">
  //       <Button
  //         variant="outline"
  //         onClick={clearPermissionStorage}
  //         className="text-red-500 border-red-300 hover:bg-red-50"
  //       >
  //         Clear Storage
  //       </Button>

  //       <Button
  //         variant="outline"
  //         onClick={() => refreshPermissions()}
  //         disabled={isRefreshing}
  //       >
  //         {isRefreshing ? "Refreshing..." : "Refresh from API"}
  //       </Button>
  //     </div>

  //     <div className="mt-4 text-xs text-gray-500">
  //       <p>
  //         <strong>How it works:</strong> Clear storage to simulate the
  //         localStorage being cleared. The system will automatically try to fetch
  //         permissions from the API as a fallback.
  //       </p>
  //     </div>
  //   </div>
  // );
}
