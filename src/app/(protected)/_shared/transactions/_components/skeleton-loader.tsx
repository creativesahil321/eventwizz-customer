"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";

export function TransactionsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="border rounded-md overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-4 flex-1">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TransactionsTableSkeleton() {
  return (
    <div className="relative w-full overflow-hidden text-black">
      <div className={pageCardClassName("min-w-0 max-w-full")}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mb-6 mt-6 flex flex-col gap-4 sm:flex-row">
          <Skeleton className="h-9 w-full sm:w-[180px]" />
          <Skeleton className="h-9 w-full sm:w-[180px]" />
          <Skeleton className="h-9 w-full sm:w-[180px]" />
        </div>
        <div className={pageCardClassName("overflow-hidden !py-0")}>
          <TransactionsListSkeleton />
        </div>
      </div>
    </div>
  );
}

