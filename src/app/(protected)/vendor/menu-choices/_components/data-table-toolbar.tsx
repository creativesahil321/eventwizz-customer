"use client";

import type { DataTableFilterField } from "@/hooks/data-table/use-data-table";
import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import * as React from "react";

import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { cn, toSentenceCase } from "@/lib/utils";
import { DebouncedInput } from "./search-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableToolbarProps<TData>
  extends React.HTMLAttributes<HTMLDivElement> {
  table: Table<TData>;
  filterFields?: DataTableFilterField<TData>[];
  showViewOptions?: boolean;
  title?: string;
}

export function DataTableToolbar<TData>({
  table,
  filterFields = [],
  children,
  showViewOptions = false,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  // Memoize searchable and filterable columns.
  const { searchableColumns, filterableColumns } = React.useMemo(() => {
    return {
      searchableColumns: filterFields.filter((field) => !field.options),
      filterableColumns: filterFields.filter((field) => field.options),
    };
  }, [filterFields]);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex w-full flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2 overflow-auto rounded-md text-black",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 items-center gap-2 flex-wrap">
        {searchableColumns.length > 0 &&
          searchableColumns.map(
            (column) =>
              table.getColumn(String(column.id)) && (
                <DebouncedInput
                  key={String(column.id)}
                  placeholder={column.placeholder}
                  value={
                    (table
                      .getColumn(String(column.id))
                      ?.getFilterValue() as string) ?? ""
                  }
                  id={`search-${column.id}`}
                  delay={300}
                  className="h-9 w-full md:w-64"
                  onChange={(value) =>
                    table.getColumn(String(column.id))?.setFilterValue(value)
                  }
                />
              )
          )}
        {filterableColumns.length > 0 &&
          filterableColumns.map((column) => {
            const colInstance = table.getColumn(String(column.id));
            if (!colInstance) return null;

            if ((column as any).type === "dropdown") {
              const currentValue = colInstance.getFilterValue();
              const valueArray = Array.isArray(currentValue)
                ? currentValue
                : [];

              return (
                <Select
                  key={String(column.id)}
                  value={valueArray[0] ?? ""}
                  onValueChange={(value) => colInstance.setFilterValue([value])}
                >
                  <SelectTrigger
                    id={`filter-${column.id}`}
                    className="h-9 w-full md:w-[180px]"
                  >
                    <SelectValue placeholder={column.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>{column.label}</SelectLabel>
                      {(column.options ?? []).map((option: any) => (
                        <SelectItem key={option.value} value={option.value}>
                          {toSentenceCase(option.label)}{" "}
                          {option.count ? `(${option.count})` : ""}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              );
            } else {
              return (
                <DataTableFacetedFilter
                  key={String(column.id)}
                  column={colInstance}
                  title={column.label}
                  options={column.options ?? []}
                />
              );
            }
          })}
        {isFiltered && (
          <Button
            aria-label="Reset filters"
            className="h-9"
            variant="event-outline"
            onClick={() => table.resetColumnFilters()}
            size="sm"
          >
            Reset <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {showViewOptions && <DataTableViewOptions table={table} />}
      </div>
    </div>
  );
}
