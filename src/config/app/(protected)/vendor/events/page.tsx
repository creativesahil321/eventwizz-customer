import { SearchParams } from "@/types";
import { Shell } from "@/components/shell";
import PageSkeleton from "./_components/skeleton";
import { Suspense } from "react";
import EventTabs from "./_components/event-tabs";
import { PermissionRoute } from "@/components/permission";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <PermissionRoute
      permissionKey="read-event"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page">
        <Shell className="gap-2">
          <Suspense fallback={<PageSkeleton count={15} />}>
            <EventTabs search={resolvedSearchParams} />
          </Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
