"use client";

import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { exportTableToCSV } from "@/lib/export";

interface TableToolbarActionsProps<TData> {
  table: Table<TData>;
}

export function TableToolbarActions<TData>({
  table,
}: TableToolbarActionsProps<TData>) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          exportTableToCSV(table, {
            filename: "bookings",
            excludeColumns: ["select", "actions"],
          })
        }
      >
        CSV
      </Button>
    </div>
  );
}
