"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

export default function VendorDashboardSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* Summary */}
      <section className="w-full">
        <section className="w-full relative bg-background dark:border p-6 rounded-md">
          <header className="w-full mb-6">
            <Skeleton className="h-8 w-24" />
          </header>
          <main className="w-full">
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-sm" />
              ))}
            </section>
          </main>
        </section>
      </section>

      {/* Bookings & Commissions */}
      <section className="w-full">
        <section className="w-full relative bg-background dark:border p-6 rounded-md">
          <header className="w-full mb-6">
            <Skeleton className="h-8 w-48" />
          </header>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-16" />
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-md" />
              ))}
            </div>
          </div>
        </section>
      </section>

      {/* Recent Bookings */}
      <section className="w-full relative">
        <div className="flex items-center justify-between gap-2 mb-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <DataTableSkeleton
          columnCount={7}
          rowCount={10}
          filterCount={0}
          cellWidths={["10rem", "12rem", "12rem", "6rem", "8rem", "6rem", "4rem"]}
          withPagination={false}
          withViewOptions={false}
          shrinkZero
        />
      </section>

      {/* Last Event Performing Overview */}
      <Card className="shadow-none border-none">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-[200px]" />
              <Skeleton className="h-9 w-[130px]" />
              <Skeleton className="h-9 w-[140px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 lg:px-6">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 gap-4"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
