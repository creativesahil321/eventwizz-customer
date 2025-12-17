import { Shell } from "@/components/shell";
import React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import CreateEventClientWrapper from "./client";

export default function CreateEventPage() {
  return (
    <section className="page">
      <Shell className="gap-2">
        <div className="bg-background p-3 sm:p-6 border rounded-lg mb-4 sm:mb-6">
          <div className="flex flex-1 items-start justify-start flex-col relative text-black">
            <h2 className="text-xl sm:text-2xl mb-1 title-header font-bold">
              Create New Event
            </h2>
            <p className="text-muted-foreground">
              Fill out the form tabs below to create your event
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
          <CreateEventClientWrapper />
        </React.Suspense>
      </Shell>
    </section>
  );
}
