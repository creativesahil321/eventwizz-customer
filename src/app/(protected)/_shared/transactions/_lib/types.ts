/**
 * Transaction Types
 * Defines the structure for transaction data
 */

export interface Transaction {
  id: number;
  date: string; // e.g., "5 days ago"
  transaction_id: string;
  amount: string; // Formatted: "£50.00"
  amount_raw: number;
  currency: string;
  status: string; // Display: "Pending", "Completed", etc.
  status_key: string; // API key: "pending", "success", etc.
  payment_method: string; // Display: "Card Payment"
  payment_method_key: string; // API key: "stripe", "bank_transfer", etc.
  description: string;
  booking_id: number;
  booking_number: string; // e.g., "EV-004"
  created_at: string;
  paid_at: string | null;
}

export type TransactionStatus =
  | "pending"
  | "success" // API uses "success" for completed
  | "completed" // Backward compatibility
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
  payment_date?: string;
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
  /** Numeric total from API summary (formatted in UI with tenant currency) */
  total_amount_value: number;
  pending_count: number;
  completed_count: number;
  failed_count: number;
}

export interface TransactionsResponse {
  data: Transaction[];
  meta?: TransactionMeta;
}
