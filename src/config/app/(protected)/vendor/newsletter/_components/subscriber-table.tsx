"use client";

import { useMemo, useState } from "react";
import { useQueryState, parseAsInteger } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import {
  useNewsletterSubscribers,
  useVendorUnsubscribe,
  type NewsletterSubscriber,
  type SubscriberListParams,
} from "@/services/common/newsletter";
import { getSubscriberColumns } from "./columns";

type SubscriberDataTableProps = {
  search: SubscriberListParams;
};

export default function SubscriberDataTable({
  search,
}: SubscriberDataTableProps) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const unsubscribe = useVendorUnsubscribe();

  const handleUnsubscribe = (subscriber: NewsletterSubscriber) => {
    setPendingId(subscriber.id);
    unsubscribe.mutate(subscriber.id, {
      onSettled: () => setPendingId(null),
    });
  };

  const columns = useMemo(
    () =>
      getSubscriberColumns({
        onUnsubscribe: handleUnsubscribe,
        pendingId,
      }),
    [pendingId],
  );

  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [per_page] = useQueryState("per_page", parseAsInteger.withDefault(30));

  const queryParams = useMemo(
    () => ({
      page: page ?? 1,
      per_page: per_page ?? 30,
      search: search.search ?? "",
      status: search.status ?? "all",
    }),
    [page, per_page, search.search, search.status],
  );

  const { data, isLoading, isError } = useNewsletterSubscribers(queryParams);
  const subscribers = useMemo(() => data?.data ?? [], [data?.data]);

  const { table } = useDataTable({
    data: subscribers,
    columns,
    pageCount: data?.meta?.last_page || 1,
    filterFields: [],
    enableAdvancedFilter: false,
    enableClientSideSorting: true,
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId: (originalRow) => String(originalRow.id),
    shallow: false,
    clearOnDefault: true,
  });

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={8}
        cellWidths={[
          "12rem",
          "18rem",
          "10rem",
          "8rem",
          "8rem",
          "8rem",
          "10rem",
          "6rem",
        ]}
        shrinkZero
        withViewOptions={false}
      />
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-md">
        <p className="text-sm text-destructive">
          Error loading subscribers. Please try again later.
        </p>
      </div>
    );
  }

  return <DataTable table={table} tableClassName="min-w-[1080px]" />;
}
