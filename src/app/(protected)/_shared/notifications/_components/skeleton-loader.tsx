import React from "react";

export function NotificationsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center p-4 border rounded-md animate-pulse"
        >
          <div className="w-10 h-10 bg-muted rounded-full mr-4"></div>
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
          <div className="ml-4">
            <div className="h-8 bg-muted rounded w-24"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsTableSkeleton() {
  return (
    <div className="w-full">
      {/* Header Skeleton */}
      <div className="bg-white p-4 sm:p-6 rounded-md shadow-sm mb-2">
        <div className="flex items-center mb-6">
          <div className="h-8 bg-muted rounded w-48"></div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="h-5 bg-muted rounded w-20"></div>
            <div className="h-9 bg-muted rounded w-[180px]"></div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-5 bg-muted rounded w-20"></div>
            <div className="h-9 bg-muted rounded w-[180px]"></div>
          </div>
        </div>
      </div>

      {/* Notifications List Skeleton */}
      <div className="bg-white rounded-md shadow-sm">
        <NotificationsListSkeleton />
      </div>
    </div>
  );
}
