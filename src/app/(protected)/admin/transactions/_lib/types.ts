import type { Row } from "@tanstack/react-table";
import type { AdminTransactionItem } from "@/services/admin/transactions";

export type Transaction = AdminTransactionItem;

export type SearchParams = {
  page?: string;
  per_page?: string;
  search?: string;
  status?: string;
  booking_date?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: string;
  sort_dir?: string;
  [key: string]: string | string[] | undefined;
};

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  type: "view" | "download";
}
