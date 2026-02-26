import { type Table as TanstackTable, flexRender } from "@tanstack/react-table";
import type * as React from "react";
import { useRef, useCallback } from "react";

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
  /** Optional class for the table element (e.g. min-w-[800px] for horizontal scroll on mobile) */
  tableClassName?: string;
  /** When false, hides the pagination footer. @default true */
  showPagination?: boolean;
  /** When true, header stays fixed and only table body scrolls horizontally (like Transaction History) */
  stickyHeader?: boolean;
}

function renderHeaderCells<TData>(table: TanstackTable<TData>) {
  return table.getHeaderGroups().map((headerGroup) => (
    <TableRow key={headerGroup.id}>
      {headerGroup.headers.map((header) => {
        const columnSize = header.getSize();
        const hasCustomSize =
          header.column.columnDef.size && header.column.columnDef.size !== 150;
        return (
          <TableHead
            key={header.id}
            colSpan={header.colSpan}
            className={cn(header.column.columnDef.meta?.className as string)}
            style={{
              ...getCommonPinningStyles({ column: header.column }),
              ...(hasCustomSize && {
                width: `${columnSize}px`,
                minWidth: header.column.columnDef.minSize
                  ? `${header.column.columnDef.minSize}px`
                  : undefined,
                maxWidth: header.column.columnDef.maxSize
                  ? `${header.column.columnDef.maxSize}px`
                  : undefined,
              }),
            }}
          >
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </TableHead>
        );
      })}
    </TableRow>
  ));
}

function renderBodyCells<TData>(
  table: TanstackTable<TData>,
  emptyStateRenderer: (() => React.ReactNode) | undefined,
  defaultEmptyStateRenderer: () => React.ReactNode,
) {
  if (table.getRowModel().rows?.length) {
    return table.getRowModel().rows.map((row) => (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() && "selected"}
        className="border-b hover:bg-slate-100"
      >
        {row.getVisibleCells().map((cell) => {
          const hasCustomSize =
            cell.column.columnDef.size && cell.column.columnDef.size !== 150;
          return (
            <TableCell
              key={cell.id}
              className={cn(
                "py-4 px-4",
                cell.column.columnDef.meta?.className as string,
              )}
              style={{
                ...getCommonPinningStyles({ column: cell.column }),
                ...(hasCustomSize && {
                  width: `${cell.column.getSize()}px`,
                  minWidth: cell.column.columnDef.minSize
                    ? `${cell.column.columnDef.minSize}px`
                    : undefined,
                  maxWidth: cell.column.columnDef.maxSize
                    ? `${cell.column.columnDef.maxSize}px`
                    : undefined,
                }),
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        })}
      </TableRow>
    ));
  }
  return emptyStateRenderer
    ? emptyStateRenderer()
    : defaultEmptyStateRenderer();
}

export function DataTable<TData>({
  table,
  floatingBar = null,
  emptyStateRenderer,
  tableClassName,
  showPagination = true,
  stickyHeader = false,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const syncScrollFromBody = useCallback(() => {
    if (!bodyScrollRef.current || !headerScrollRef.current) return;
    headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
  }, []);

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

  const tableContent = (
    <>
      <Table className={cn("w-full", tableClassName)}>
        <TableHeader>{renderHeaderCells(table)}</TableHeader>
        <TableBody className="bg-background">
          {renderBodyCells(
            table,
            emptyStateRenderer,
            defaultEmptyStateRenderer,
          )}
        </TableBody>
      </Table>
    </>
  );

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2.5",
        stickyHeader ? "" : "overflow-auto",
        className,
      )}
      {...props}
    >
      {children}
      {stickyHeader ? (
        <div className="rounded-md border border-t-0 text-black overflow-hidden flex flex-col min-h-0">
          <div
            ref={headerScrollRef}
            className="overflow-x-auto overflow-y-hidden border-b bg-slate-50 shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="min-w-0">
              <table
                className={cn("w-full caption-bottom text-sm table-fixed", tableClassName)}
              >
                <thead
                  data-slot="table-header"
                  className="[&_tr]:border-b bg-slate-50"
                >
                  {renderHeaderCells(table)}
                </thead>
              </table>
            </div>
          </div>
          <div
            ref={bodyScrollRef}
            onScroll={syncScrollFromBody}
            className="overflow-x-auto overflow-y-auto flex-1 min-h-0"
          >
            <table
              className={cn("w-full caption-bottom text-sm table-fixed", tableClassName)}
            >
              <tbody
                data-slot="table-body"
                className="[&_tr:last-child]:border-0 bg-background"
              >
                {renderBodyCells(
                  table,
                  emptyStateRenderer,
                  defaultEmptyStateRenderer,
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <section className="overflow-x-auto rounded-md border text-black">
          {tableContent}
        </section>
      )}
      {(showPagination ||
        (table.getFilteredSelectedRowModel().rows.length > 0 &&
          floatingBar)) && (
        <footer className="bg-background border w-full p-4 my-4 rounded-lg min-w-0">
          <div className="flex flex-col gap-2.5 min-w-0">
            {showPagination && <DataTablePagination table={table} />}
            {table.getFilteredSelectedRowModel().rows.length > 0 && floatingBar}
          </div>
        </footer>
      )}
    </div>
  );
}
