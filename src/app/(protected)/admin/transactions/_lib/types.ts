import type { Row } from "@tanstack/react-table";

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
  search?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  [key: string]: string | string[] | undefined;
};

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  type: "view" | "download";
}
