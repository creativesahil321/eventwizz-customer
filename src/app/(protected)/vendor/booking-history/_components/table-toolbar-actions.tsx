"use client";

import type { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { exportTableToCSV } from "@/lib/export";
import { History } from "../_lib/types";

interface TableToolbarActionsProps {
  table: Table<History>;
}
export function TableToolbarActions({ table }: TableToolbarActionsProps) {
  return (
    <nav className="flex items-center gap-2">
      <Button
        onClick={() =>
          exportTableToCSV(table, {
            filename: "orders-history",
            excludeColumns: ["select", "actions"],
          })
        }
        variant="event-outline"
      >
        CSV
      </Button>
    </nav>
  );
}
