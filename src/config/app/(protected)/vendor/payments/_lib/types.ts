import { Row } from "@tanstack/react-table";

export type Payment = {
  id?: string | number;
  event_name: string;
  menu_name: string;
  category: string | number;
  event_type?: string;
  status: string;
  created_at: string | Date;
};
export type SearchParams = {
  page?: string;
  per_page?: string;
  sort?: string;
  menu_name?: string;
  status?: string;
  from?: string;
  to?: string;
  filters?: string;
  [key: string]: string | string[] | undefined;
};

export type PaymentsParams = {
  search?: string;
  page?: number | string;
  per_page?: number | string;
  event_type?: string;
  menu?: string;
  status?: string;
  options?: unknown;
};
export interface DataTableRowAction<TData> {
  row: Row<TData>;
  type: "update" | "delete" | "mail";
}
