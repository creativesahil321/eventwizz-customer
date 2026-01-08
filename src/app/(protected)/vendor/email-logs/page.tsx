import { searchParamsCache } from "./_lib/validations";
import { Shell } from "@/components/shell";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { SearchParams } from "./_lib/types";
import { fetchEmailLogs } from "./_lib/actions";
import EmailLogsDataTable from "./_components/email-data-table";
interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function Page(props: PageProps) {
  const rawSearchParams = await props.searchParams;
  const parsedSearch = searchParamsCache.parse(
    rawSearchParams as Record<string, string | string[] | undefined>
  );
  const { data: initialData } = await fetchEmailLogs(parsedSearch);
  const search: SearchParams = {
    ...parsedSearch,
    page: String(parsedSearch.page),
    per_page: String(parsedSearch.per_page),
  };
  return (
    <section className="page overflow-x-auto">
      <Shell className="gap-2 overflow-visible">
        <Suspense
          fallback={
            <DataTableSkeleton
              columnCount={6}
              cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem", "8rem"]}
              shrinkZero
            />
          }
        >
          <EmailLogsDataTable initialData={initialData} search={search} />
        </Suspense>
      </Shell>
    </section>
  );
}
