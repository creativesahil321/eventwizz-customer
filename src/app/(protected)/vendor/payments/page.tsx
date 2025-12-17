import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Shell } from "@/components/shell";
import React from "react";
import { searchParamsCache } from "./_lib/validations";
import { fetchPayments } from "./_lib/actions";
import { SearchParams } from "./_lib/types";
import PaymentsTable from "./_components/payments-table";

interface PageProps {
  searchParams: Promise<SearchParams>;
}
export default async function Page(props: PageProps) {
  const rawSearchParams = await props.searchParams;
  const parsedSearch = searchParamsCache.parse(
    rawSearchParams as Record<string, string | string[] | undefined>
  );
  const { data: initialData } = await fetchPayments(parsedSearch);
  const paymentSearch: SearchParams = {
    ...parsedSearch,
    page: String(parsedSearch.page),
    per_page: String(parsedSearch.per_page),
  };
  return (
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
          <PaymentsTable initialData={initialData} search={paymentSearch} />
        </React.Suspense>
      </Shell>
    </section>
  );
}
