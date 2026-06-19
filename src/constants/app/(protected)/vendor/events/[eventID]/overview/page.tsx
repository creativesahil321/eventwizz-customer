import { Suspense } from "react";
import { Shell } from "@/components/shell";
import EventOverviewClient from "./event-overview-content";
import EventOverviewSkeleton from "./_components/overview-skeleton";
import { PermissionRoute } from "@/components/permission";

interface PageProps {
  params: Promise<{ eventID: string }>;
}

export default async function EventOverviewPage({ params }: PageProps) {
  const { eventID } = await params;

  return (
    <PermissionRoute
      permissionKey="read-event"
      fallbackPath="/vendor/events"
    >
      <section className="page">
        <Shell className="gap-4">
          <Suspense fallback={<EventOverviewSkeleton />}>
            <EventOverviewClient eventId={eventID} />
          </Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
