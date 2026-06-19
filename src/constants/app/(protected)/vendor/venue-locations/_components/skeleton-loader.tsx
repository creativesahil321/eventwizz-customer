import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonLoaderProps {
  className?: string;
}

export function LocationsTableSkeleton({
  className = "",
}: SkeletonLoaderProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Toolbar skeletons */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Search bar skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="p-2 bg-muted/40">
          <div className="flex items-center gap-4 py-2">
            {[12, 20, 20, 15, 15, 10].map((width, i) => (
              <Skeleton key={i} className={`h-4 w-${width}`} />
            ))}
          </div>
        </div>
        <div className="p-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-4 border-b last:border-0"
            >
              {[8, 24, 16, 24, 12, 12, 8].map((width, j) => (
                <Skeleton key={j} className={`h-4 w-${width}`} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

export function LocationsPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <LocationsTableSkeleton className="animate-pulse" />
    </div>
  );
}
