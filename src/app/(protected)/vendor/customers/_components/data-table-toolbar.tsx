"use client";

import type { DataTableFilterField } from "@/types";
import type { Table } from "@tanstack/react-table";
import * as React from "react";

import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DebouncedInput } from "./search-input";
import { TableToolbarActions } from "./table-toolbar-actions";

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
  title,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
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
        "flex w-full items-center mb-6 justify-between overflow-auto text-black",
        className
      )}
      {...props}
    >
      <>
        <header className="w-full relative flex flex-col lg:flex-row items-start justify-between lg:items-center">
          <nav className="flex flex-row lg:flex-col w-full lg:w-fit justify-between">
            <h2 className="text-2xl mb-3 title-header font-bold">
              {title ? title : "Templates"}
            </h2>
            <TableToolbarActions table={table} />
          </nav>
          <nav className="flex w-full lg:w-fit justify-between flex-row gap-4">
            {searchableColumns.length > 0 &&
              searchableColumns.map(
                (column) =>
                  table.getColumn(String(column.id)) && (
                    <nav
                      key={String(column.id)}
                      className="space-x-4 w-fit flex items-center"
                    >
                      <Label className="hidden lg:block" htmlFor="search">
                        Search
                      </Label>
                      <DebouncedInput
                        placeholder={column.placeholder}
                        value={
                          (table
                            .getColumn(String(column.id))
                            ?.getFilterValue() as string) ?? ""
                        }
                        id="search"
                        delay={300}
                        className="h-10 w-40 lg:w-64"
                        onChange={(value) =>
                          table
                            .getColumn(String(column.id))
                            ?.setFilterValue(value)
                        }
                      />
                    </nav>
                  )
              )}
            <div className="flex items-center gap-2">
              {children}
              {showViewOptions && <DataTableViewOptions table={table} />}
            </div>
          </nav>
        </header>
      </>
    </div>
  );
}
