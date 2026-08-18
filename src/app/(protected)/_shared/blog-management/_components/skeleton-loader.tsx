"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function BlogListSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-2.5 sm:px-4 sm:py-3"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-10" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white"
          >
            <Skeleton className="h-44 w-full" />
            <div className="space-y-2 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BlogFormSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 sm:p-6">
        <Skeleton className="mb-4 h-6 w-40" />
        <Skeleton className="h-10 w-full" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
