"use client";
import { Shell } from "@/components/shell";
import React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import EmailTemplatesTable from "@/app/(protected)/_shared/email-templates/_component/email-data-table";
import { useSearchParams } from "next/navigation";
import { PermissionRoute } from "@/components/permission";

export default function Page() {
  // Get search params from client side
  const searchParams = useSearchParams();

  // Parse search params on client
  const parsedSearch = React.useMemo(() => {
    return {
      page: Number(searchParams?.get("page") || 1),
      per_page: Number(searchParams?.get("per_page") || 10),
      search: searchParams?.get("search") || "",
      options: {},
    };
  }, [searchParams]);

  return (
    <PermissionRoute permissionKey="read-email-template" fallbackPath="/unauthorized">
      <section className="page">
        <Shell className="gap-2">
          <React.Suspense
            fallback={
              <DataTableSkeleton
                columnCount={6}
                cellWidths={[
                  "10rem",
                  "40rem",
                  "12rem",
                  "12rem",
                  "8rem",
                  "8rem",
                ]}
                shrinkZero
              />
            }
          >
            <EmailTemplatesTable
              initialData={[]}
              search={parsedSearch}
              pageCount={undefined}
            />
          </React.Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
