import { Suspense } from "react";
import { Shell } from "@/components/shell";
import EventOverviewClient from "./event-overview-content";
import EventOverviewSkeleton from "./_components/overview-skeleton";

interface PageProps {
  params: Promise<{ eventID: string }>;
}

export default async function EventOverviewPage({ params }: PageProps) {
  const { eventID } = await params;

  return (
    <section className="page">
      <Shell className="gap-4">
        <Suspense fallback={<EventOverviewSkeleton />}>
          <EventOverviewClient eventId={eventID} />
        </Suspense>
      </Shell>
    </section>
  );
}
