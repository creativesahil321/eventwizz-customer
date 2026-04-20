"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SystemLogEntry } from "../_lib/types";
import { format, parse } from "date-fns";
import { enUS } from "date-fns/locale";

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

function formatLogTime(raw: string): string {
  try {
    const parsed = parse(raw, "dd MMM yyyy HH:mm:ss", new Date(), {
      locale: enUS,
    });
    if (Number.isNaN(parsed.getTime())) {
      const fallback = new Date(raw);
      if (!Number.isNaN(fallback.getTime())) {
        return format(fallback, "dd MMM yyyy, HH:mm");
      }
      return raw;
    }
    return format(parsed, "dd MMM yyyy, HH:mm");
  } catch {
    return raw;
  }
}

export function getSystemLogColumns(): ColumnDef<SystemLogEntry>[] {
  return [
    {
      accessorKey: "time",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date & time" />
      ),
      meta: {
        className:
          "w-[11rem] min-w-[11rem] max-w-[12rem] align-top whitespace-nowrap",
      },
      cell: ({ row }) => {
        const raw = row.getValue("time") as string;
        return (
          <span className="text-muted-foreground whitespace-nowrap tabular-nums">
            {formatLogTime(raw)}
          </span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "level",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Level" />
      ),
      meta: {
        className: "w-[7rem] min-w-[7rem] max-w-[8rem] align-top",
      },
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
      enableSorting: false,
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Message" />
      ),
      meta: {
        className:
          "min-w-0 align-top whitespace-normal [overflow-wrap:anywhere]",
      },
      cell: ({ row }) => {
        const msg = (row.getValue("description") as string) ?? "";
        return (
          <span className="text-sm text-foreground block max-w-full leading-relaxed break-words whitespace-normal [overflow-wrap:anywhere]">
            {msg}
          </span>
        );
      },
      enableSorting: false,
    },
  ];
}
