"use client";

import type { DataTableFilterItem } from "@/types";
import type { Table } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
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
  filterFields?: DataTableFilterItem[];
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
        "flex w-full items-center mb-6 justify-between gap-2 overflow-auto",
        className
      )}
      {...props}
    >
      <div className="flex w-full items-center justify-between flex-row relative text-black">
        <h2 className="text-2xl mb-0 title-header font-bold">
          {title ? title : "orders"}
        </h2>
        <section className="flex space-x-4 items-center">
          {searchableColumns.length > 0 &&
            searchableColumns.map(
              (column) =>
                table.getColumn(String(column.id)) && (
                  <nav
                    key={String(column.id)}
                    className="space-x-4 w-fit flex items-center"
                  >
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={18} />
                      </div>
                      <DebouncedInput
                        placeholder={column.placeholder ?? ""}
                        value={
                          (table
                            .getColumn(String(column.id))
                            ?.getFilterValue() as string) ?? ""
                        }
                        id="Search by Event"
                        delay={300}
                        className="h-9 w-40 lg:w-64 bg-transparent pl-10"
                        onChange={(value) =>
                          table
                            .getColumn(String(column.id))
                            ?.setFilterValue(value)
                        }
                      />
                    </div>
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
                    className="space-x-4 w-fit flex items-center"
                  >
                    <Label htmlFor="search">Search By</Label>
                    <Select
                      key={String(column.id)}
                      value={valueArray[0] ?? ""}
                      onValueChange={(value) =>
                        colInstance.setFilterValue([value])
                      }
                    >
                      <SelectTrigger className="h-12 w-[180px]">
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
              variant="event-outline"
              aria-label="Reset filters"
              className="h-8 px-2 lg:px-3"
              onClick={() => table.resetColumnFilters()}
            >
              Reset <X />
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
