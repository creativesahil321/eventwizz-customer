import { Row } from "@tanstack/react-table";

export type Transaction = {
  payment_id: number;
  booking_number: string;
  transaction_id: string;
  booking_date: string;
  event_date: string;
  full_name: string;
  email: string;
  card_brand: string;
  cardLast4: string;
  status: string;
  amount: string;
  platform_fee: string;
};

export type SearchParams = {
  page?: string;
  per_page?: string;
  sort?: string;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  from_date?: string;
  to_date?: string;
  filters?: string;
  [key: string]: string | string[] | undefined;
};

export type TransactionsParams = {
  search?: string;
  page?: number | string;
  per_page?: number | string;
  status?: string;
  booking_date?: string;
  from_date?: string;
  to_date?: string;
  options?: unknown;
};

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  type: "view" | "download";
}

export interface TransactionMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  path: string;
}
