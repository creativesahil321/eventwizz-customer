import { Shell } from "@/components/shell";
import React from "react";
import { SearchParams } from "@/types";
import { fetchTickets } from "./_lib/mock-api";
import { cache } from "react";
import SupportTicketTable from "./_components/support-ticket-table";
import { PermissionRoute } from "@/components/permission";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

const getTickets = cache(async (perPage: number) => {
  return await fetchTickets(perPage);
});

export default async function Page({
  searchParams: searchParamsPromise,
}: PageProps) {
  const searchParams = await searchParamsPromise;
  const perPage = Number(searchParams.per_page) || 10;
  let tickets;
  try {
    tickets = await getTickets(perPage);
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    return (
      <section className="page">
        <Shell className="gap-2">
          <section className="flex items-center justify-center py-10 text-red-500">
            Failed to load tickets. Please try again later.
          </section>
        </Shell>
      </section>
    );
  }

  return (
    <PermissionRoute permissionKey="read-ticket" fallbackPath="/unauthorized">
      <section className="page">
        <Shell className="gap-2">
          <React.Suspense fallback={<SkeletonLoader />}>
            <section className="w-full">
              <SupportTicketTable initialData={tickets} search={searchParams} />
            </section>
          </React.Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}

const SkeletonLoader = () => (
  <section className="w-full py-10">
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-3/4 bg-gray-200 rounded"></div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 w-full bg-gray-200 rounded"></div>
      ))}
    </div>
  </section>
);
