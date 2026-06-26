/**
 * Central exports for commonly used types
 * This file re-exports types from the domain-specific type files
 * for easier access across the application
 */

import type { ColumnSort } from "@tanstack/react-table";
import { FC, ReactNode, SVGProps } from "react";
import { LucideIcon } from "lucide-react";

// Re-export common types from domain-specific files
export type { UserType, AuthState } from "./auth.types";
export type { ThemeSchema, ThemeSettings } from "./theme.types";

/**
 * Unified Option type that supports both SVG components and Lucide icons
 */
export interface Option {
  label: string;
  value: string;
  icon?: FC<SVGProps<SVGSVGElement>> | LucideIcon;
  count?: number | string;
}

/**
 * Raw search params from URL or form inputs
 * This type allows for string, string[], or number values
 */
export type SearchParams = {
  page?: string | string[] | number;
  per_page?: string | string[] | number;
  status?: string | string[];
  from?: string | string[];
  to?: string | string[];
  [key: string]: string | string[] | number | undefined;
};

/**
 * Parsed search params with consistent types
 * This ensures all consumers get the same data types
 */
export type ParsedSearchParams = {
  readonly page: number;
  readonly per_page: number;
  readonly status: string;
  readonly from: string;
  readonly to: string;
  [key: string]: string | number | boolean | undefined;
};

/**
 * Helper function to parse string or array to string
 * @param value The value to parse
 * @param defaultValue Optional default if value is undefined
 */
export function parseAsString(
  value: string | string[] | number | undefined,
  defaultValue: string = ""
): string {
  if (value === undefined) return defaultValue;
  if (typeof value === "number") return value.toString();
  return Array.isArray(value) ? value[0] || defaultValue : value;
}

/**
 * Helper function to parse string or array to number
 * @param value The value to parse
 * @param defaultValue Optional default if value is undefined or NaN
 */
export function parseAsNumber(
  value: string | string[] | number | undefined,
  defaultValue: number = 0
): number {
  if (typeof value === "number") return value;
  if (value === undefined) return defaultValue;

  const parsed = parseInt(Array.isArray(value) ? value[0] || "" : value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse search params into consistent types
 * @param params Raw search params from URL or form
 */
export function parseSearchParams(params: SearchParams): ParsedSearchParams {
  return {
    page: parseAsNumber(params.page, 1),
    per_page: parseAsNumber(params.per_page, 10),
    status: parseAsString(params.status, ""),
    from: parseAsString(params.from, ""),
    to: parseAsString(params.to, ""),
    // Add other common fields as needed
    ...Object.entries(params)
      .filter(
        ([key]) => !["page", "per_page", "status", "from", "to"].includes(key)
      )
      .reduce((acc, [key, value]) => {
        if (typeof value === "number") {
          acc[key] = value;
        } else if (typeof value === "string") {
          acc[key] = value;
        } else if (Array.isArray(value)) {
          acc[key] = value[0] || "";
        }
        return acc;
      }, {} as Record<string, string | number>),
  };
}

// Data table related types
export type StringKeyOf<TData> = Extract<keyof TData, string>;

export interface DataTableSearchableColumn<TData> {
  id: StringKeyOf<TData>;
  title: string;
}

export interface DataTableFilterableColumn<TData> {
  id: StringKeyOf<TData>;
  title: string;
  options: Option[];
}

export interface DataTableSortingState {
  id: string;
  desc: boolean;
}

export interface DataTableFilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface DataTableFilterItem {
  placeholder: unknown;
  label: ReactNode;
  id: string;
  options: unknown;
  column: string;
  value: string[] | null;
}

export interface DataTableFilterState {
  [column: string]: string[] | null;
}

export interface DataTableSearchState {
  query: string;
}

export interface DataTableMultiSortState {
  sorts: ColumnSort[];
}

export interface DataTablePaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface DataTableViewState {
  pagination: DataTablePaginationState;
  columnVisibility: {
    [key: string]: boolean;
  };
  sorting: DataTableMultiSortState;
  filtering: DataTableFilterState;
  searching: DataTableSearchState;
}

export interface DataTableFilterProps<TData> {
  column?: StringKeyOf<TData>;
  title?: string;
  options: Option[];
}
