"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UtensilsCrossed, Users } from "lucide-react";
import { TableInfo } from "../_lib/types";

interface TableSwitcherProps {
  readonly tables: TableInfo[];
  readonly selectedTableId: string;
  readonly onTableChange: (tableId: string) => void;
}

export default function TableSwitcher({
  tables,
  selectedTableId,
  onTableChange,
}: Readonly<TableSwitcherProps>) {
  if (tables.length <= 1) {
    return null;
  }

  const selectedTable = tables.find((t) => t.table_id === selectedTableId);

  return (
    <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex shrink-0 items-center gap-2">
        <UtensilsCrossed className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
          Table Selection
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <Select value={selectedTableId} onValueChange={onTableChange}>
          <SelectTrigger className="h-9 w-full min-w-0 bg-white [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate">
            <SelectValue placeholder="Select a table">
              <div className="flex min-w-0 w-full items-center gap-1.5">
                <span className="min-w-0 truncate text-left font-medium text-sm">
                  {selectedTable?.table_name || "Select a table"}
                </span>
                {selectedTable && (
                  <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {selectedTable.guests}/{selectedTable.seats}
                  </span>
                )}
              </div>
            </SelectValue>
          </SelectTrigger>
        <SelectContent>
          {tables.map((table) => (
            <SelectItem key={table.table_id} value={table.table_id}>
              <div className="flex items-center gap-2 py-0.5">
                <div
                  className="p-1 rounded shrink-0"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                  }}
                >
                  <UtensilsCrossed
                    className="h-3.5 w-3.5"
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-medium text-sm">{table.table_name}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {table.guests} of {table.seats} seats
                    </span>
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
        </Select>
      </div>
    </div>
  );
}

