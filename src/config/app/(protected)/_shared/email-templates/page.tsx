import { Shell } from "@/components/shell";
import React from "react";
import { searchParamsCache } from "./_lib/validations";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { fetchEmailTemplates } from "./_lib/actions";
import { EmailTemplate, SearchParams } from "./_lib/types";
import EmailTemplatesTable from "./_component/email-data-table";
interface PageProps {
  searchParams: Promise<SearchParams>;
}
export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse({
    page: searchParams.page as string,
    per_page: searchParams.per_page as string,
    search: searchParams.search as string,
    options: searchParams.options as string | string[] | undefined,
  });

  const templates = await fetchEmailTemplates(search);
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
          <EmailTemplatesTable
            initialData={templates?.data as unknown as EmailTemplate[]}
            search={search}
          />
        </React.Suspense>
      </Shell>
    </section>
  );
}
