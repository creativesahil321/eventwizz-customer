"use client";

import type { DataTableFilterField } from "@/types";
import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import * as React from "react";

import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  title,
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
        "flex w-full flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2 overflow-auto",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 items-start justify-start flex-col gap-2 relative text-black">
        <div className="flex items-center w-full">
          <div className="flex items-center">
            <h2 className="text-2xl mb-0 title-header font-bold">
              {title ? title : "Payments"}
            </h2>
          </div>
        </div>
        <section className="flex flex-col md:flex-row md:space-x-4 gap-4 md:gap-2 md:items-center w-full flex-wrap">
          {searchableColumns.length > 0 &&
            searchableColumns.map(
              (column) =>
                table.getColumn(String(column.id)) && (
                  <nav
                    key={String(column.id)}
                    className="flex flex-col md:flex-row md:space-x-2 w-full md:w-fit md:items-center"
                  >
                    <Label htmlFor="search" className="mb-1 md:mb-0">
                      Search By
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
                      className="h-9 w-full md:w-64"
                      onChange={(value) =>
                        table
                          .getColumn(String(column.id))
                          ?.setFilterValue(value)
                      }
                    />
                  </nav>
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
                  <nav
                    key={String(column.id)}
                    className="flex flex-col md:flex-row md:space-x-2 w-full md:w-fit md:items-center"
                  >
                    <Label
                      htmlFor={`filter-${column.id}`}
                      className="mb-1 md:mb-0"
                    >
                      Filter By
                    </Label>
                    <Select
                      key={String(column.id)}
                      value={valueArray[0] ?? ""}
                      onValueChange={(value) =>
                        colInstance.setFilterValue([value])
                      }
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
                  </nav>
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
              className="h-9 md:self-end"
              variant="event-outline"
              onClick={() => table.resetColumnFilters()}
              size="sm"
            >
              Reset <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </section>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {showViewOptions && <DataTableViewOptions table={table} />}
      </div>
    </div>
  );
}
