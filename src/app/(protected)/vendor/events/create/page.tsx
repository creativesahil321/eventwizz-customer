import { Shell } from "@/components/shell";
import React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import CreateEventClientWrapper from "./client";
import { PermissionRoute } from "@/components/permission";

export default function CreateEventPage() {
  return (
    <PermissionRoute
      permissionKey="create-event"
      fallbackPath="/vendor/events"
    >
      <section className="page">
        <Shell className="gap-2">
          <React.Suspense
            fallback={
              <DataTableSkeleton
                columnCount={6}
                cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem", "8rem"]}
                shrinkZero
              />
            }
          >
            <CreateEventClientWrapper />
          </React.Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
