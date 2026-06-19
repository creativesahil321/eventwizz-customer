"use client";

import type { DataTableFilterItem } from "@/types";
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
      searchableColumns: filterFields.filter(
        (field) =>
          !Array.isArray(
            field.options as unknown as DataTableFilterItem[] | undefined
          )
      ),
      filterableColumns: filterFields.filter((field) =>
        Array.isArray(
          field.options as unknown as DataTableFilterItem[] | undefined
        )
      ),
    };
  }, [filterFields]);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex w-full flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2 overflow-auto text-black",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 items-start justify-start flex-col gap-2 relative">
        <div className="flex items-center w-full">
          <h2 className="text-2xl mb-0 title-header font-bold">
            {title ? title : "Notifications"}
          </h2>
        </div>
        <section className="flex flex-col md:flex-row md:space-x-4 gap-4 md:gap-2 md:items-center w-full flex-wrap">
          {searchableColumns.length > 0 &&
            searchableColumns.map(
              (column) =>
                table.getColumn(String(column.id as string)) && (
                  <nav
                    key={String(column.id as string)}
                    className="flex flex-col md:flex-row md:space-x-2 w-full md:w-fit md:items-center"
                  >
                    <Label htmlFor="search" className="mb-1 md:mb-0">
                      Search By
                    </Label>
                    <DebouncedInput
                      placeholder={column.placeholder as unknown as string}
                      value={
                        (table
                          .getColumn(String(column.id as string))
                          ?.getFilterValue() as string) ?? ""
                      }
                      id="search"
                      delay={300}
                      className="h-9 w-full md:w-64"
                      onChange={(value) =>
                        table
                          .getColumn(String(column.id as string))
                          ?.setFilterValue(value)
                      }
                    />
                  </nav>
                )
            )}
          {filterableColumns.length > 0 &&
            filterableColumns.map((column) => {
              const colInstance = table.getColumn(String(column.id as string));
              if (!colInstance) return null;

              if ((column as unknown as { type: string }).type === "dropdown") {
                const currentValue = colInstance.getFilterValue();
                const valueArray = Array.isArray(currentValue)
                  ? currentValue
                  : [];

                return (
                  <nav
                    key={String(column.id as string)}
                    className="flex flex-col md:flex-row md:space-x-2 w-full md:w-fit md:items-center"
                  >
                    <Label
                      htmlFor={`filter-${column.id as string}`}
                      className="mb-1 md:mb-0"
                    >
                      Filter By
                    </Label>
                    <Select
                      key={String(column.id as string)}
                      value={valueArray[0] ?? ""}
                      onValueChange={(value) =>
                        colInstance.setFilterValue([value])
                      }
                    >
                      <SelectTrigger
                        id={`filter-${column.id as string}`}
                        className="h-9 w-full md:w-[180px]"
                      >
                        <SelectValue placeholder={column.label} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>{column.label}</SelectLabel>
                          {(
                            (column.options as unknown as {
                              label: string;
                              value: string;
                              count: number | undefined | string | number;
                            }[]) ?? []
                          ).map(
                            (option: {
                              value: string;
                              label: string;
                              count: number | undefined | string | number;
                            }) => (
                              <SelectItem
                                key={option.value}
                                value={option.value as string}
                              >
                                {toSentenceCase(option.label)}{" "}
                                {option.count ? `(${option.count})` : ""}
                              </SelectItem>
                            )
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </nav>
                );
              } else {
                return (
                  <DataTableFacetedFilter
                    key={String(column.id as string)}
                    column={colInstance}
                    title={column.label as unknown as string}
                    options={(
                      (column.options as unknown as {
                        label: string;
                        value: string;
                        count: number | undefined | string;
                      }[]) ?? []
                    ).map(
                      (option: {
                        label: string;
                        value: string;
                        count: number | undefined | string;
                      }) => ({
                        label: option.label,
                        value:
                          typeof option.value === "string" ? option.value : "",
                        count: option.count,
                      })
                    )}
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
