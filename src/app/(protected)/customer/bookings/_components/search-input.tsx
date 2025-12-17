"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Table } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

interface SearchInputProps<TData> {
  table: Table<TData>;
  placeholder?: string;
  className?: string;
}

export function SearchInput<TData>({
  table,
  placeholder = "Search...",
  className,
}: SearchInputProps<TData>) {
  return (
    <div className={cn("relative w-full max-w-xs", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={(table.getState().globalFilter as string) ?? ""}
        onChange={(event) => table.setGlobalFilter(event.target.value)}
        className="h-8 w-full pl-9"
      />
    </div>
  );
}
