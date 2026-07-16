import React from "react";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";

export function NotificationsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center rounded-lg border border-[var(--color-border)] p-4"
        >
          <div className="mr-4 size-10 rounded-full bg-muted" />
          <div className="flex-1">
            <div className="mb-2 h-4 w-1/4 rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
          <div className="ml-4 h-8 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function NotificationsTableSkeleton() {
  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div className={pageCardClassName()}>
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="mt-2 h-4 w-72 rounded bg-muted" />
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="h-10 w-[180px] rounded bg-muted" />
        </div>
      </div>

      <div className={pageCardClassName()}>
        <NotificationsListSkeleton />
      </div>
    </div>
  );
}
