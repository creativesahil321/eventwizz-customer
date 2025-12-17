// app/(protected)/vendor/notifications/_components/notification-table.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Notification, SearchParams, DataTableRowAction } from "../_lib/types";
import type { DataTableFilterField } from "@/hooks/data-table/use-data-table";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { getNotificationColumns } from "./notification-columns";
import { toSentenceCase } from "@/lib/utils";
import { useNotifications } from "../_lib/queries";
import { DataTableToolbar } from "./data-table-toolbar";
import NotificationViewDialog from "./_notification-view";
import { Notification as ApiNotification } from "@/services/common/notification/type";

const dynamicCategoryFilter = [
  { id: 1, title: "Customer", value: "customer" },
  { id: 2, title: "Order", value: "order" },
  { id: 3, title: "Payment", value: "payment" },
  { id: 4, title: "Account", value: "account" },
  { id: 5, title: "Event", value: "event" },
];

type NotificationTableProps = {
  readonly initialData: Notification[];
  readonly search: SearchParams;
};

export default function NotificationTable({
  initialData,
  search,
}: NotificationTableProps) {
  const [rowAction, setRowAction] =
    useState<DataTableRowAction<Notification> | null>(null);

  // Transform API Notification to component Notification type
  const transformApiNotification = (
    apiNotif: ApiNotification
  ): Notification => {
    return {
      id: apiNotif.id.toString(),
      timestamp: apiNotif.created_at,
      role: "vendor", // Default role, adjust based on your needs
      read: apiNotif.is_read === 1,
      priority: "medium", // Default priority, adjust based on your needs
      payload: {
        user: {
          username: apiNotif.user.full_name,
          firstName: apiNotif.user.full_name.split(" ")[0] || "",
          lastName: apiNotif.user.full_name.split(" ").slice(1).join(" ") || "",
          avatar: apiNotif.user.avatar,
        },
        category: "", // Extract from notice or title if needed
        notification: apiNotif.notice,
        date: apiNotif.created_at,
      },
    };
  };

  const {
    data: queryData,
    isError,
    error,
  } = useNotifications({
    page: search.page,
    limit: search.per_page,
    category:
      search.category === "all" ? undefined : search.category || undefined,
    status:
      search.read === ""
        ? undefined
        : search.read === "true"
        ? "read"
        : search.read === "false"
        ? "unread"
        : undefined,
  });

  const columns = useMemo(() => getNotificationColumns({ setRowAction }), []);

  const notificationData = useMemo(() => {
    if (queryData?.data?.data) {
      return queryData.data.data.map(transformApiNotification);
    }
    return initialData;
  }, [queryData?.data?.data, initialData]);

  const pageCount = useMemo(
    () =>
      Math.ceil(
        (queryData?.data?.meta?.total || notificationData.length) /
          (search.per_page || 20)
      ),
    [queryData?.data?.meta?.total, notificationData.length, search.per_page]
  );

  const filterFields = useMemo(
    () =>
      [
        {
          id: "read" as Extract<keyof Notification, string>,
          label: "Status",
          type: "dropdown",
          options: [
            { label: "All", value: "all" },
            { label: "Read", value: "true" },
            { label: "Unread", value: "false" },
          ],
          placeholder: "Filter by status",
        },
      ] as DataTableFilterField<Notification>[],
    []
  );

  const { table } = useDataTable({
    data: notificationData,
    columns,
    pageCount,
    filterFields,
    enableAdvancedFilter: false,
    initialState: {
      sorting: [
        {
          id: "timestamp" as keyof Notification,
          desc: search.sort?.includes("desc") ?? true,
        },
      ],
      columnPinning: { right: ["actions"] },
    },
    getRowId: (row) => String(row.id),
    shallow: false,
    clearOnDefault: true,
  });

  const title =
    dynamicCategoryFilter.find((cat) => cat.value === search.category)?.title ||
    "Notifications";

  return (
    <section className="w-full min-w-0 relative">
      {isError ? (
        <div className="p-4 text-red-500">
          Error loading notifications:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      ) : notificationData.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No notifications found. Try adjusting your filters.
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-x-auto">
          <DataTable table={table} className="min-w-0">
            <DataTableToolbar
              className="bg-background p-6 mb-4 w-full min-w-0"
              table={table}
              filterFields={[
                {
                  id: "category",
                  label: "Category",
                  options: [
                    { label: "All", value: "all" },
                    ...dynamicCategoryFilter.map((option) => ({
                      label: toSentenceCase(option.title),
                      value: option.value,
                    })),
                  ],
                  placeholder: "Filter by category",
                  column: "category",
                  value: null,
                },
                {
                  id: "read",
                  label: "Status",
                  options: [
                    { label: "All", value: "all" },
                    { label: "Read", value: "true" },
                    { label: "Unread", value: "false" },
                  ],
                  placeholder: "Filter by status",
                  column: "read",
                  value: null,
                },
              ]}
              title={title}
            />
          </DataTable>
        </div>
      )}
      {rowAction?.type === "view-details" && (
        <NotificationViewDialog
          open
          onOpenChange={() => setRowAction(null)}
          notification={rowAction?.row?.original}
        />
      )}
    </section>
  );
}
