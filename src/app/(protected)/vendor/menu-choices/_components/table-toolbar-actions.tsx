"use client";

import type { Table } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { exportTableToCSV } from "@/lib/export";
import { MenuChoice } from "../_lib/types";

interface TableToolbarActionsProps {
  table: Table<MenuChoice>;
}
export function TableToolbarActions({ table }: TableToolbarActionsProps) {
  return (
    <nav className="flex w-full lg:fit items-center gap-2">
      <Button
        variant="event-outline"
        size="sm"
        onClick={() =>
          exportTableToCSV(table, {
            filename: "menu-choices",
            excludeColumns: ["select", "actions"],
          })
        }
      >
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </nav>
  );
}
