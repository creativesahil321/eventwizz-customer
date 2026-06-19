import React from "react";
import { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";
import { Location } from "../_lib/types";

interface DataTableToolbarProps {
  table: Table<Location>;
  className?: string;
  title?: string;
  children?: React.ReactNode;
}

export function DataTableToolbar({
  table,
  className = "",
  title = "Event Locations",
  children,
}: DataTableToolbarProps) {
  // Get global filter value from table
  const searchValue = table.getState().globalFilter;

  // Check if any filters are applied
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Title and toolbar actions - only show if title is not empty */}
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <div className="flex items-center gap-2">{children}</div>
        </div>
      )}

      {/* If no title, just show the actions row */}
      {!title && children && (
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">{children}</div>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchValue || ""}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="pl-8 max-w-sm"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.setGlobalFilter("")}
                className="absolute right-1 top-1.5 h-6 w-6 p-0.5"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear</span>
              </Button>
            )}
          </div>

          {/* Clear filters button */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
