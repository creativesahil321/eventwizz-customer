"use client";

import type { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { exportTableToCSV } from "@/lib/export";
import { Customer } from "../_lib/types";

interface TableToolbarActionsProps {
  table: Table<Customer>;
}
export function TableToolbarActions({ table }: TableToolbarActionsProps) {
  return (
    <nav className="flex items-center gap-2">
      <Button
        variant="event-primary"
        onClick={() =>
          exportTableToCSV(table, {
            filename: "vendor-customers",
            excludeColumns: ["select", "actions"],
          })
        }
      >
        CSV
      </Button>
    </nav>
  );
}
