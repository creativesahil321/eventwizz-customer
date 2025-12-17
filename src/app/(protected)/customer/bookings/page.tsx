import { SearchParams } from "@/types";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import BookingsListContent from "./_components/bookings-list-content";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <section className="w-full">
      <Suspense fallback={<PageLoader />}>
        <BookingsListContent search={resolvedSearchParams} />
      </Suspense>
    </section>
  );
}
