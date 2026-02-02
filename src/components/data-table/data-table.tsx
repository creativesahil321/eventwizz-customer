import { type Table as TanstackTable, flexRender } from "@tanstack/react-table";
import type * as React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCommonPinningStyles } from "@/lib/data-table";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./data-table-pagination";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  floatingBar?: React.ReactNode | null;
  emptyStateRenderer?: () => React.ReactNode;
}

export function DataTable<TData>({
  table,
  floatingBar = null,
  emptyStateRenderer,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  // Default empty state renderer
  const defaultEmptyStateRenderer = () => (
    <TableRow>
      <TableCell
        colSpan={table.getAllColumns().length}
        className="h-24 text-center"
      >
        No results.
      </TableCell>
    </TableRow>
  );

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2.5 overflow-auto",
        className
      )}
      {...props}
    >
      {children}
      <section className="overflow-x-auto rounded-md border text-black">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnSize = header.getSize();
                  const hasCustomSize = header.column.columnDef.size && header.column.columnDef.size !== 150;
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(header.column.columnDef.meta?.className as string)}
                      style={{
                        ...getCommonPinningStyles({ column: header.column }),
                        ...(hasCustomSize && {
                          width: `${columnSize}px`,
                          minWidth: header.column.columnDef.minSize ? `${header.column.columnDef.minSize}px` : undefined,
                          maxWidth: header.column.columnDef.maxSize ? `${header.column.columnDef.maxSize}px` : undefined,
                        }),
                      }}
                    >
                      {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="bg-background">
            {table.getRowModel().rows?.length
              ? table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-b hover:bg-slate-100"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const hasCustomSize = cell.column.columnDef.size && cell.column.columnDef.size !== 150;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "py-4 px-4",
                            (cell.column.columnDef.meta?.className as string)
                          )}
                          style={{
                            ...getCommonPinningStyles({ column: cell.column }),
                            ...(hasCustomSize && {
                              width: `${cell.column.getSize()}px`,
                              minWidth: cell.column.columnDef.minSize ? `${cell.column.columnDef.minSize}px` : undefined,
                              maxWidth: cell.column.columnDef.maxSize ? `${cell.column.columnDef.maxSize}px` : undefined,
                            }),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              : // Use the provided emptyStateRenderer or fall back to the default
              emptyStateRenderer
              ? emptyStateRenderer()
              : defaultEmptyStateRenderer()}
          </TableBody>
        </Table>
      </section>
      <footer className="bg-background border w-full p-4 my-4 rounded-lg min-w-0">
        <div className="flex flex-col gap-2.5 min-w-0">
          <DataTablePagination table={table} />
          {table.getFilteredSelectedRowModel().rows.length > 0 && floatingBar}
        </div>
      </footer>
    </div>
  );
}
