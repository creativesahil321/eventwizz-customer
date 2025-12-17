import { Row } from "@tanstack/react-table";

export type Order = {
  title: string;
  value: number;
};
export type Orders = {
  today: Order[];
  weekly: Order[];
  monthly: Order[];
  yearly: Order[];
};
export type OrderProps = {
  title: string;
  orderStatus: Orders;
};
export type tabType = keyof Orders;

export type TransactionHistory = {
  id: string;
  date: string;
  amount: number;
  status: string;
};
export type User = {
  id?: string;
  user_name: string;
  avatar?: string;
  email?: string;
};
export type Booking = {
  id: string;
  event_name: string;
  user: User;
  booking_date: string;
  tickets: number;
  total_table: number;
  total_people: number;
  paid_amount: number;
  balance_amount: number;
  discount: number;
  total_amount: number;
  payment_status: string;
  transaction_history: TransactionHistory[];
  date: string;
  amount: number;
  status?: string;
  created_at: string;
};

export type BookingResponse = {
  data: Booking[];
  page: number;
  per_page: number;
  search: string;
};

export type QueryParams = {
  page: number;
  per_page: number;
  search: string;
};

export type OrdersResponse = {
  data: Booking[];
  links?: any;
  meta?: any;
};

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  type: "show";
}

export type SearchParams = {
  page: number | string;
  per_page: number | string;
  search: string;
};
