import React from "react";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";

export function NotificationsListSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((group) => (
        <div key={group} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-px flex-1 bg-muted" />
            <div className="h-3 w-4 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex animate-pulse items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3.5"
              >
                <div className="size-10 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="h-4 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-12 rounded bg-muted" />
                  </div>
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsTableSkeleton() {
  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div className={pageCardClassName()}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="mt-2 h-4 w-72 rounded bg-muted" />
          </div>
          <div className="h-10 w-36 rounded bg-muted" />
        </div>
      </div>

      <div className={pageCardClassName("space-y-5")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="h-11 flex-1 rounded-xl bg-muted" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((chip) => (
              <div key={chip} className="h-9 w-20 rounded-full bg-muted" />
            ))}
          </div>
        </div>
        <NotificationsListSkeleton />
      </div>
    </div>
  );
}
