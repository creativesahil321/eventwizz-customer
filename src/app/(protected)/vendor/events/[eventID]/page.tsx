import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { Shell } from "@/components/shell";
import React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import EventClientWrapper from "./client";
import { PermissionRoute } from "@/components/permission";
import { EventDiscountsCard } from "@/app/(protected)/vendor/discounts/_components/event-discounts-card";

interface PageProps {
  params: Promise<{ eventID: string }>;
}

export default async function IndexPage({ params }: PageProps) {
  const { eventID } = await params;

  return (
    <PermissionRoute
      permissionKey="read-event"
      fallbackPath="/vendor/events"
    >
      <section className="page text-black">
        <Shell className="gap-2">
          <div className={pageCardClassName("mb-4 space-y-4 sm:mb-6 min-w-0")}>
            <div className="flex flex-1 flex-col items-start justify-start relative text-black">
              <h1 className="title-header mb-1 text-xl font-bold sm:text-2xl">
                Edit Event
              </h1>
              <p className="text-muted-foreground">
                Update event details below. Use Discounts to add promotions for
                this event.
              </p>
            </div>
            <EventDiscountsCard eventId={eventID} variant="compact" />
          </div>

          <React.Suspense
            fallback={
              <DataTableSkeleton
                columnCount={6}
                cellWidths={[
                  "10rem",
                  "40rem",
                  "12rem",
                  "12rem",
                  "8rem",
                  "8rem",
                ]}
                shrinkZero
              />
            }
          >
            <EventClientWrapper eventId={eventID} />
          </React.Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
