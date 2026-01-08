"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for a single booking item
 * Used during infinite scroll loading
 */
export function BookingItemSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date & Status */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>

          {/* Tables Configuration */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-3 w-20 mt-2" />
          </div>

          {/* Booking Stats */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <div className="grid grid-cols-3 gap-2 pb-2 border-b">
              <div className="text-center space-y-1">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
              <div className="text-center space-y-1 border-x px-2">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
              <div className="text-center space-y-1">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            </div>
            <Skeleton className="h-4 w-24" />
            <div className="space-y-1.5">
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
