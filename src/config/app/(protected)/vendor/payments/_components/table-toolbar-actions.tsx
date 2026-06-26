"use client";

import type { Table } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { exportTableToCSV } from "@/lib/export";
import { Payment } from "../_lib/types";

interface TableToolbarActionsProps {
  table: Table<Payment>;
}
export function TableToolbarActions({ table }: TableToolbarActionsProps) {
  return (
    <nav className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          exportTableToCSV(table, {
            filename: "customers",
            excludeColumns: ["select", "actions"],
          })
        }
      >
        <Download />
        Export
      </Button>
    </nav>
  );
}
