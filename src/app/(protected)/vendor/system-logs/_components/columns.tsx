"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SystemLogEntry } from "../_lib/types";
import { format } from "date-fns";

const levelVariant: Record<
  SystemLogEntry["level"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  info: "secondary",
  warning: "outline",
  error: "destructive",
};

const levelClassName: Record<SystemLogEntry["level"], string | undefined> = {
  info: undefined,
  warning: "bg-amber-100 text-amber-800 border-amber-200 capitalize",
  error: undefined,
};

export function getSystemLogColumns(): ColumnDef<SystemLogEntry>[] {
  return [
    {
      accessorKey: "timestamp",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date & time" />
      ),
      cell: ({ row }) => {
        const ts = row.getValue("timestamp") as string;
        try {
          const date = new Date(ts);
          return (
            <span className="text-muted-foreground whitespace-nowrap">
              {format(date, "dd MMM yyyy, HH:mm")}
            </span>
          );
        } catch {
          return <span className="text-muted-foreground">{ts}</span>;
        }
      },
      enableSorting: true,
      sortingFn: "datetime",
    },
    {
      accessorKey: "level",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Level" />
      ),
      cell: ({ row }) => {
        const level = row.getValue("level") as SystemLogEntry["level"];
        return (
          <Badge
            variant={levelVariant[level]}
            className={cn("capitalize", levelClassName[level])}
          >
            {level}
          </Badge>
        );
      },
      enableSorting: true,
      filterFn: (row, id, value) => {
        const v = value as string[];
        if (!v?.length) return true;
        return v.includes(row.getValue(id) as string);
      },
    },
    {
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Action" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("action")}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "user",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate max-w-[180px] block">
          {row.getValue("user")}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "message",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Message" />
      ),
      cell: ({ row }) => {
        const msg = (row.getValue("message") as string) ?? "";
        return (
          <span
            className="text-sm truncate max-w-[320px] block"
            title={msg}
          >
            {msg}
          </span>
        );
      },
      enableSorting: true,
    },
  ];
}
