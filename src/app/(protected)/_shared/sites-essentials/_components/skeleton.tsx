"use client";

import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function SiteEssentialsFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={pageCardClassName("mb-6 min-w-0")}>
        <div className="flex flex-1 items-start justify-start flex-col relative text-black">
          <Skeleton className="h-8 w-52 mb-1" />
        </div>
      </div>

      {/* Tabs */}
      <div className="grid w-full md:w-auto grid-cols-3 md:grid-cols-5 mb-4 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={`tab-${i}`}
            className={`h-10 rounded-md ${i > 2 ? "hidden md:block" : ""}`}
          />
        ))}
      </div>

      {/* Form Card */}
      <Card className="p-4 md:p-6">
        <div className="space-y-6">
          {/* Form Section Title */}
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Form Fields - First Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          {/* Form Fields - Second Row (Images) */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-40 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end mt-6">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </Card>
    </div>
  );
}
