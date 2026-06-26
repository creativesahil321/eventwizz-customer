import { SearchParams } from "@/types";
import { Suspense } from "react";
import BookingsListContent from "./_components/bookings-list-content";
import BookingsPageSkeleton from "./_components/bookings-page-skeleton";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <section className="w-full">
      <Suspense fallback={<BookingsPageSkeleton />}>
        <BookingsListContent search={resolvedSearchParams} />
      </Suspense>
    </section>
  );
}
