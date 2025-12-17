"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { StatusFilter } from "./status-filter";
import { SearchInput } from "./search-input";
import { DataTableFilterField } from "@/hooks/data-table/use-data-table";
import { cn } from "@/lib/utils";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterFields?: DataTableFilterField<TData>[];
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  filterFields = [],
  title,
  className,
  children,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-4",
        className
      )}
    >
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-2xl font-bold title-header whitespace-nowrap">
          {title}
        </h2>

        <div className="flex items-center gap-2">
          {filterFields.length > 0 &&
            filterFields.map(
              (field) =>
                field.type === "dropdown" && (
                  <StatusFilter
                    key={String(field.id)}
                    column={table.getColumn(field.id ? String(field.id) : "")}
                    title={field.label}
                    options={field.options ?? []}
                  />
                )
            )}
          {isFiltered && (
            <Button
              aria-label="Reset filters"
              variant="event-primary"
              className="h-8 px-2 lg:px-3"
              onClick={() => table.resetColumnFilters()}
            >
              Reset
              <Cross2Icon className="ml-2 size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SearchInput table={table} placeholder="Search..." />
        {children}
      </div>
    </div>
  );
}
