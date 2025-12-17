"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <section className="w-full relative flex flex-col space-y-8">
      {/* Profile Section Skeleton */}
      <section className="w-full relative">
        <div className="w-full relative bg-background p-6 rounded-md shadow-sm">
          <header className="w-full mb-6">
            <Skeleton className="h-8 w-40" />
          </header>

          <div className="space-y-6">
            {/* Avatar Upload Skeleton */}
            <div>
              <Skeleton className="h-5 w-16 mb-2" />
              <div className="border border-dashed border-gray-300 rounded w-60 p-6 flex flex-col items-center justify-center">
                <Skeleton className="w-16 h-16 rounded-full mb-2" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>

            {/* Form Fields Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* First Name */}
              <div>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-11 w-full" />
              </div>

              {/* Last Name */}
              <div>
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-11 w-full" />
              </div>

              {/* Phone */}
              <div>
                <Skeleton className="h-5 w-16 mb-2" />
                <Skeleton className="h-11 w-full" />
              </div>

              {/* Address */}
              <div>
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-11 w-full" />
              </div>

              {/* City */}
              <div>
                <Skeleton className="h-5 w-12 mb-2" />
                <Skeleton className="h-11 w-full" />
              </div>

              {/* Postcode */}
              <div>
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </section>

      {/* Account Section Skeleton */}
      <section className="w-full relative">
        <div className="w-full relative bg-background p-6 rounded-md shadow-sm">
          <header className="w-full mb-6">
            <Skeleton className="h-8 w-32" />
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Username */}
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-11 w-full" />
            </div>

            {/* Email */}
            <div>
              <Skeleton className="h-5 w-16 mb-2" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Password Section Skeleton */}
      <section className="w-full relative">
        <div className="w-full relative bg-background p-6 rounded-md shadow-sm">
          <header className="w-full mb-6">
            <Skeleton className="h-8 w-48" />
          </header>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Current Password */}
              <div>
                <Skeleton className="h-5 w-36 mb-2" />
                <Skeleton className="h-11 w-full" />
              </div>

              {/* New Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-11 w-full" />
              </div>
            </div>

            {/* Update Button */}
            <div className="flex justify-end">
              <Skeleton className="h-10 w-36" />
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
