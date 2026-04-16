/**
 * Customer Transaction Service
 * Handles API calls related to customer transactions
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import {
  Transaction,
  TransactionFilters,
  TransactionsResponse,
  TransactionStats,
  TransactionMeta,
} from "@/app/(protected)/_shared/transactions/_lib/types";
import { parseFormattedMoney } from "@/lib/currency-format";

export interface CustomerTransactionsResponse {
  status: boolean;
  message: string;
  data: Transaction[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    path: string;
    links: Array<{
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }>;
  };
  summary: {
    total: number;
    amount: string;
  };
}

/**
 * Fetch customer transactions with pagination and filters
 */
export const fetchCustomerTransactions = async (
  params: TransactionFilters = {}
): Promise<CustomerTransactionsResponse> => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status = "",
    payment_date = "",
    payment_method = "",
  } = params;

  // Convert "all" to empty string for filters
  const statusParam = !status || status === "all" ? "" : status;
  const methodParam = !payment_method || payment_method === "all" ? "" : payment_method;

  const endpoint = API_ENDPOINTS.CUSTOMER.TRANSACTIONS.GET_ALL.replace(
    "{page}",
    String(page)
  )
    .replace("{per_page}", String(limit))
    .replace("{search}", search || "")
    .replace("{status}", statusParam)
    .replace("{payment_date}", payment_date || "")
    .replace("{method}", methodParam);

  return api.get<CustomerTransactionsResponse>(endpoint, {
    returnFullResponse: true,
  });
};

export const transactionService = {
  /**
   * Get all transactions for the current customer
   */
  getTransactions: async (
    filters?: TransactionFilters
  ): Promise<TransactionsResponse> => {
    const response = await fetchCustomerTransactions(filters);

    return {
      data: response.data,
      meta: {
        total: response.meta.total,
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        last_page: response.meta.last_page,
      },
      summary: response.summary,
    };
  },

  /**
   * Maps API summary to UI stats (same shape as legacy getTransactionStats).
   */
  mapSummaryToStats: (summary: {
    total: number;
    amount: string;
  }): TransactionStats => {
    const total_amount_value = parseFormattedMoney(
      String(summary.amount ?? ""),
    );
    const safeTotal = Number.isFinite(total_amount_value)
      ? total_amount_value
      : 0;

    return {
      total_transactions: summary.total,
      total_amount_value: safeTotal,
      pending_count: 0,
      completed_count: 0,
      failed_count: 0,
    };
  },

  /**
   * Get transaction statistics
   */
  getTransactionStats: async (): Promise<TransactionStats> => {
    const response = await fetchCustomerTransactions({ page: 1, limit: 1 });
    return transactionService.mapSummaryToStats(response.summary);
  },

  /**
   * Get a single transaction by ID
   */
  getTransactionById: async (id: number): Promise<Transaction> => {
    const response = await fetchCustomerTransactions({ page: 1, limit: 1000 });
    const transaction = response.data.find((t) => t.id === id);

    if (!transaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    return transaction;
  },
};
