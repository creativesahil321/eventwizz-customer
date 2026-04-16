"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function BookingSummarySkeleton() {
  return (
    <>
      {/* Desktop Skeleton */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-20 p-5 space-y-4">
          <Skeleton className="h-5 w-32" />

          {/* Date breakdown skeleton */}
          <div className="space-y-2">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-10 rounded-md" />
                <Skeleton className="h-5 w-10 rounded-md" />
              </div>
            </div>
          </div>

          <Skeleton className="h-[1px] w-full" />

          {/* Pricing skeleton */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-[1px] w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>

          <Skeleton className="h-[1px] w-full" />

          {/* Payment method skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          <Skeleton className="h-[1px] w-full" />

          {/* CTA skeleton */}
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="flex justify-center gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      {/* Mobile skeleton (bottom bar) */}
      <div className="lg:hidden">
        <div className="h-20" />
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-11 w-28 rounded-xl" />
          </div>
        </div>
      </div>
    </>
  );
}
