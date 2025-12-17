"use client";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import { DataTableRowAction, EmailTemplate, SearchParams } from "../_lib/types";
import React from "react";
import { getColumns } from "./columns";
import { DataTable } from "@/components/data-table/data-table";
import { useEmailTemplates } from "../_lib/queries";
import { DataTableToolbar } from "./data-table-toolbar";
import { ShowEmailTemplateDialog } from "./_view-template";
import EmailTemplateEditModal from "./email-template-edit-modal";
import { TableCell, TableRow } from "@/components/ui/table";
import EmailTemplatesSkeleton from "./email-templates-skeleton";

type EmailTemplateProps = {
  initialData: EmailTemplate[];
  search: SearchParams;
  pageCount?: number;
};

// Type for pagination metadata
interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  path: string;
  per_page: number;
  to: number;
  total: number;
  links?: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
}

export default function EmailTemplatesTable({
  initialData,
  search,
  pageCount: initialPageCount,
}: EmailTemplateProps) {
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<EmailTemplate> | null>(null);

  const memoizedSearch = React.useMemo(() => search, [search]);
  const {
    data: emailTemplates = { data: { data: [] } },
    refetch,
    isError,
    isFetching,
  } = useEmailTemplates(search, initialData);

  const getColumn = React.useCallback(
    () => getColumns({ setRowAction }),
    [setRowAction]
  );
  const columns = React.useMemo(() => getColumn(), [getColumn]);
  const getRowId = React.useCallback(
    (originalRow: EmailTemplate) => String(originalRow?.id || ""),
    []
  );

  // Extract metadata from API response
  const metaData = React.useMemo<PaginationMeta | null>(() => {
    if (
      emailTemplates &&
      typeof emailTemplates === "object" &&
      "data" in emailTemplates &&
      emailTemplates.data &&
      typeof emailTemplates.data === "object" &&
      "meta" in emailTemplates.data &&
      typeof emailTemplates.data.meta === "object" &&
      emailTemplates.data.meta !== null
    ) {
      // Cast to PaginationMeta to ensure type safety
      return emailTemplates.data.meta as PaginationMeta;
    }
    return null;
  }, [emailTemplates]);

  // Calculate the actual page count and total items from API response
  const pageCount = React.useMemo(() => {
    if (metaData) {
      const total = metaData.total || 0;
      const perPage = Number(
        metaData.per_page || memoizedSearch?.per_page || 10
      );
      const lastPage = metaData.last_page || Math.ceil(total / perPage) || 1;

      return lastPage;
    }

    // Fallback to provided value or default
    return initialPageCount || 1;
  }, [metaData, memoizedSearch?.per_page, initialPageCount]);

  // Get actual data array to display
  const tableData = React.useMemo(() => {
    // Check if emailTemplates has the expected structure with data.data
    if (
      emailTemplates &&
      typeof emailTemplates === "object" &&
      "data" in emailTemplates &&
      emailTemplates.data &&
      typeof emailTemplates.data === "object" &&
      "data" in emailTemplates.data &&
      Array.isArray(emailTemplates.data.data)
    ) {
      return emailTemplates.data.data;
    }

    // For backward compatibility
    if (Array.isArray(emailTemplates)) {
      return emailTemplates;
    }

    return [];
  }, [emailTemplates]);
  const { table } = useDataTable({
    data: tableData as EmailTemplate[],
    columns,
    pageCount: pageCount,
    filterFields: [],
    enableAdvancedFilter: false,
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId,
    shallow: true,
    clearOnDefault: true,
  });

  const handleEditSuccess = () => {
    refetch();
    setRowAction(null);
  };

  // Custom renderer for empty table state that shows skeleton when loading
  const renderEmptyState = React.useCallback(() => {
    if (isFetching) {
      return <EmailTemplatesSkeleton />;
    }

    if (isError) {
      return (
        <TableRow>
          <TableCell
            colSpan={table.getAllColumns().length}
            className="h-24 text-center"
          >
            Error loading data. Please try again.
          </TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow>
        <TableCell
          colSpan={table.getAllColumns().length}
          className="h-24 text-center"
        >
          No results.
        </TableCell>
      </TableRow>
    );
  }, [isFetching, isError, table]);

  return (
    <section className="w-full relative">
      <div className="max-w-full overflow-x-auto rounded-lg">
        <DataTable table={table} emptyStateRenderer={renderEmptyState}>
          <DataTableToolbar
            className="bg-background p-3 sm:p-6 border rounded-lg"
            table={table}
            filterFields={[]}
            title="Email Templates"
          ></DataTableToolbar>
        </DataTable>
      </div>
      {rowAction?.type === "show" && (
        <ShowEmailTemplateDialog
          open={rowAction?.type === "show"}
          onOpenChange={() => setRowAction(null)}
          template={rowAction?.row?.original ? rowAction?.row.original : null}
          showTrigger={false}
          onSuccess={() => rowAction?.row.toggleSelected(false)}
        />
      )}
      {rowAction?.type === "update" && (
        <EmailTemplateEditModal
          isOpen={rowAction?.type === "update"}
          onClose={() => setRowAction(null)}
          templateId={rowAction?.row?.original?.id}
          onSaved={handleEditSuccess}
        />
      )}
    </section>
  );
}
