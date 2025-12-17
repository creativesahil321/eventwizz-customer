/**
 * Transaction Types
 * Defines the structure for transaction data
 */

export interface Transaction {
  id: number;
  transaction_id: string;
  booking_id?: number;
  amount: string;
  currency: string;
  status: TransactionStatus;
  payment_method: string;
  gateway: string;
  description?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, string | number | boolean>;
}

export type TransactionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "cancelled";

export type TransactionType =
  | "payment"
  | "refund"
  | "partial_payment"
  | "deposit"
  | "full_payment";

export interface TransactionFilters {
  status?: TransactionStatus | "all";
  type?: TransactionType | "all";
  payment_method?: string | "all";
  page?: number;
  limit?: number;
  search?: string;
}

export interface TransactionMeta {
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
}

export interface TransactionStats {
  total_transactions: number;
  total_amount: string;
  pending_count: number;
  completed_count: number;
  failed_count: number;
}

export interface TransactionsResponse {
  data: Transaction[];
  meta?: TransactionMeta;
}
