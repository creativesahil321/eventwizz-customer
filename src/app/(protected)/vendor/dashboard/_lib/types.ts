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

/** Bookings stats per period (for Bookings tab) */
export type BookingsStats = Orders;
/** Commission stats per period (for Commissions tab) — same shape as Bookings */
export type CommissionsStats = Orders;

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
  /** From API recent_bookings; used for Transaction ID column. id is booking_id for navigation. */
  transaction_id?: string;
  event_name: string;
  user: User;
  /** Optional for table accessor/sorting when row is built from API (e.g. dashboard recent_bookings) */
  user_name?: string;
  booking_date: string;
  tickets: number;
  total_table: number;
  total_people: number;
  paid_amount: number;
  balance_amount: number;
  discount: number;
  total_amount: number;
  /** Present only when promo savings exist. */
  saved_amount?: number | null;
  /** Present only when a coupon was used. */
  coupon_code?: string | null;
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
