import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { Shell } from "@/components/shell";
import React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import EventClientWrapper from "./client";
import { PermissionRoute } from "@/components/permission";

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
          <div className={pageCardClassName("mb-4 sm:mb-6 min-w-0")}>
            <div className="flex flex-1 items-start justify-start flex-col relative text-black">
              <h1 className="text-xl sm:text-2xl mb-1 title-header font-bold">
                Edit Event
              </h1>
              <p className="text-muted-foreground">
                Update your event details using the tabs below
              </p>
            </div>
          </div>

          <React.Suspense
            fallback={
              <DataTableSkeleton
                columnCount={6}
                cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem", "8rem"]}
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
