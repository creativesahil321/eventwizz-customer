import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface BookingsSkeletonProps {
  count?: number;
}

export default function BookingsSkeleton({
  count = 10,
}: BookingsSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="overflow-hidden animate-pulse flex flex-col h-full"
        >
          {/* Image Skeleton */}
          <div className="w-full h-48 bg-muted flex-shrink-0" />

          {/* Content Skeleton */}
          <CardContent className="p-4 flex flex-col gap-3">
            {/* Title Skeleton */}
            <div className="h-5 bg-muted rounded w-3/4" />

            {/* Price Skeleton */}
            <div className="flex items-center justify-between py-2 border-t border-b">
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-6 bg-muted rounded w-24" />
            </div>

            {/* Buttons Skeleton */}
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 bg-muted rounded" />
              <div className="h-9 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
