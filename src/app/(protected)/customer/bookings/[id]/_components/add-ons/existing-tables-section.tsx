"use client";

import { Button } from "@/components/ui/button";
import { Plus, Minus, Settings } from "lucide-react";
import { TableData } from "./types";

interface ExistingTablesSectionProps {
  tables: TableData[];
  additionalPeopleCount: number;
  totalAvailableSeats: number;
  tablePeopleAdditions: Record<string, number>;
  onAddPeopleToTable: (tableId: string, delta: number) => void;
  getAvailableSeats: (table: TableData) => number;
  onManageSeating?: (tableId: string) => void;
  totalPeopleInExisting?: number;
}

export function ExistingTablesSection({
  tables,
  additionalPeopleCount,
  totalAvailableSeats,
  tablePeopleAdditions,
  onAddPeopleToTable,
  getAvailableSeats,
  onManageSeating,
  totalPeopleInExisting = 0,
}: ExistingTablesSectionProps) {
  // Helper function to calculate max people that can be added to a table
  // respecting per-table capacity limits
  const getMaxCanAddToTable = (table: TableData): number => {
    const currentAllocation = table.allocation || [];
    const maxPerTable = table.capacity;

    if (currentAllocation.length === table.table_count) {
      // Calculate max we can add: sum of (capacity - current) for each table
      return currentAllocation.reduce((sum, current) => {
        return sum + Math.max(0, maxPerTable - current);
      }, 0);
    }

    // If allocation doesn't match, use total available seats
    return getAvailableSeats(table);
  };

  const tablesWithSeats = tables
    .map((table) => ({
      ...table,
      availableSeats: getAvailableSeats(table),
      maxCanAdd: getMaxCanAddToTable(table),
    }))
    .filter((table) => table.availableSeats > 0);

  if (tablesWithSeats.length === 0) {
    return null;
  }

  // All additional people can fit in existing tables
  if (totalAvailableSeats >= additionalPeopleCount) {
    return (
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
          <p className="text-xs text-blue-900">
            <span className="font-medium">
              {totalAvailableSeats} seats available
            </span>{" "}
            in existing tables
          </p>
        </div>

        {tablesWithSeats.map((table) => {
          const peopleToAdd = tablePeopleAdditions[table.id] || 0;
          return (
            <div
              key={table.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">
                    Table for {table.capacity}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {table.table_count} table{table.table_count > 1 ? "s" : ""}{" "}
                    • {table.availableSeats} seats free
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {table.table_count > 1 &&
                  peopleToAdd > 0 &&
                  onManageSeating && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-700 border-blue-300 hover:bg-blue-100 text-xs h-8"
                      onClick={() => onManageSeating(table.id)}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Manage
                    </Button>
                  )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-gray-300 hover:border-red-400 hover:bg-red-50"
                  onClick={() => onAddPeopleToTable(table.id, -1)}
                  disabled={peopleToAdd === 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div
                  className="min-w-[2rem] text-center font-semibold text-base"
                  style={{ color: "var(--color-primary)" }}
                >
                  {peopleToAdd}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-gray-300 hover:border-green-400 hover:bg-green-50"
                  onClick={() => onAddPeopleToTable(table.id, 1)}
                  disabled={
                    peopleToAdd >= table.maxCanAdd ||
                    totalPeopleInExisting >= additionalPeopleCount
                  }
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Partial capacity - some can fit, but need additional tables
  return (
    <div className="space-y-3">
      {totalAvailableSeats > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
          <p className="text-xs text-blue-900">
            <span className="font-medium">
              {totalAvailableSeats} seats available
            </span>{" "}
            in existing tables
          </p>
        </div>
      )}

      {tablesWithSeats.map((table) => {
        const peopleToAdd = tablePeopleAdditions[table.id] || 0;
        return (
          <div
            key={table.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">
                  Table for {table.capacity}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {table.table_count} table{table.table_count > 1 ? "s" : ""} •{" "}
                  {table.availableSeats} seats free
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {table.table_count > 1 && peopleToAdd > 0 && onManageSeating && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-700 border-blue-300 hover:bg-blue-100 text-xs h-8"
                  onClick={() => onManageSeating(table.id)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Manage
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-gray-300 hover:border-red-400 hover:bg-red-50"
                onClick={() => onAddPeopleToTable(table.id, -1)}
                disabled={peopleToAdd === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div
                className="min-w-[2rem] text-center font-semibold text-base"
                style={{ color: "var(--color-primary)" }}
              >
                {peopleToAdd}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-gray-300 hover:border-green-400 hover:bg-green-50"
                onClick={() => onAddPeopleToTable(table.id, 1)}
                disabled={
                  peopleToAdd >= table.maxCanAdd ||
                  totalPeopleInExisting >= additionalPeopleCount
                }
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
