"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

// Professional Cart Skeleton Loader Component
export default function CartSkeletonLoader() {
  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm border p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Cart Items Skeleton */}
      <div className="space-y-4">
        {/* Date Accordion 1 */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="flex space-x-1 mb-4">
            <Skeleton className="h-10 w-20 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>

          {/* Tab Content Skeleton */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {/* Table/Ticket Item 1 */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>

              {/* Table/Ticket Item 2 */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>

            {/* Special Request Skeleton */}
            <div className="mt-4">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>

            {/* Save Button Skeleton */}
            <div className="flex justify-end mt-4">
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </div>
        </div>

        {/* Date Accordion 2 */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-28" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="flex space-x-1 mb-4">
            <Skeleton className="h-10 w-20 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>

          {/* Tab Content Skeleton */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Skeleton className="h-5 w-36 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>

            {/* Special Request Skeleton */}
            <div className="mt-4">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>

            {/* Save Button Skeleton */}
            <div className="flex justify-end mt-4">
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions Skeleton */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <Skeleton className="h-10 w-32 rounded-md" />
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
    </motion.div>
  );
}
