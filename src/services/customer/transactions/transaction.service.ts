/**
 * Transaction Service
 * Handles API calls related to customer transactions
 * 
 * NOTE: Currently using dummy data until API is implemented
 */

import {
  Transaction,
  TransactionFilters,
  TransactionsResponse,
  TransactionStats,
  TransactionMeta,
} from "@/app/(protected)/_shared/transactions/_lib/types";

// Dummy transaction data
const DUMMY_TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    transaction_id: "txn_20241119_001",
    booking_id: 34,
    amount: "700.00",
    currency: "£",
    status: "completed",
    payment_method: "Bank Transfer",
    gateway: "bank_transfer",
    description: "Full payment for Event Booking #34",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    transaction_id: "txn_20241119_002",
    booking_id: 37,
    amount: "450.00",
    currency: "£",
    status: "pending",
    payment_method: "Card Payment",
    gateway: "stripe",
    description: "Partial payment for Event Booking #37",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    transaction_id: "txn_20241118_003",
    booking_id: 28,
    amount: "1200.00",
    currency: "£",
    status: "completed",
    payment_method: "Card Payment",
    gateway: "stripe",
    description: "Full payment for Event Booking #28",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    transaction_id: "txn_20241117_004",
    booking_id: 25,
    amount: "300.00",
    currency: "£",
    status: "refunded",
    payment_method: "PayPal",
    gateway: "paypal",
    description: "Refund for cancelled Event Booking #25",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    transaction_id: "txn_20241116_005",
    booking_id: 22,
    amount: "850.00",
    currency: "£",
    status: "failed",
    payment_method: "Card Payment",
    gateway: "worldpay",
    description: "Failed payment attempt for Event Booking #22",
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 6,
    transaction_id: "txn_20241115_006",
    booking_id: 20,
    amount: "550.00",
    currency: "£",
    status: "completed",
    payment_method: "Klarna",
    gateway: "klarna",
    description: "Buy now, pay later - Event Booking #20",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 7,
    transaction_id: "txn_20241114_007",
    booking_id: 18,
    amount: "950.00",
    currency: "£",
    status: "completed",
    payment_method: "TrueLayer",
    gateway: "truelayer",
    description: "Bank transfer for Event Booking #18",
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 8,
    transaction_id: "txn_20241113_008",
    booking_id: 15,
    amount: "200.00",
    currency: "£",
    status: "cancelled",
    payment_method: "Card Payment",
    gateway: "stripe",
    description: "Cancelled payment for Event Booking #15",
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const transactionService = {
  /**
   * Get all transactions for the current customer
   * NOTE: Using dummy data until API is implemented
   */
  getTransactions: async (
    filters?: TransactionFilters
  ): Promise<TransactionsResponse> => {
    await delay(500); // Simulate API delay

    let filteredTransactions = [...DUMMY_TRANSACTIONS];

    // Apply filters
    if (filters?.status && filters.status !== "all") {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.status === filters.status
      );
    }

    if (filters?.type && filters.type !== "all") {
      // For now, we'll filter by description or gateway
      // In real implementation, this would be a proper type field
      if (filters.type === "refund") {
        filteredTransactions = filteredTransactions.filter(
          (t) => t.status === "refunded"
        );
      } else if (filters.type === "partial_payment") {
        filteredTransactions = filteredTransactions.filter(
          (t) => t.description?.toLowerCase().includes("partial")
        );
      }
    }

    if (filters?.payment_method && filters.payment_method !== "all") {
      filteredTransactions = filteredTransactions.filter((t) => {
        const method = (t.payment_method || t.gateway).toLowerCase();
        return method.includes(filters.payment_method!.toLowerCase());
      });
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredTransactions = filteredTransactions.filter(
        (t) =>
          t.transaction_id.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower) ||
          t.amount.includes(searchLower) ||
          t.booking_id?.toString().includes(searchLower)
      );
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTransactions = filteredTransactions.slice(
      startIndex,
      endIndex
    );

    // Create meta
    const meta: TransactionMeta = {
      total: filteredTransactions.length,
      current_page: page,
      per_page: limit,
      last_page: Math.ceil(filteredTransactions.length / limit),
    };

    return {
      data: paginatedTransactions,
      meta,
    };
  },

  /**
   * Get transaction statistics
   * NOTE: Using dummy data until API is implemented
   */
  getTransactionStats: async (): Promise<TransactionStats> => {
    await delay(300);

    const totalAmount = DUMMY_TRANSACTIONS.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0
    );

    return {
      total_transactions: DUMMY_TRANSACTIONS.length,
      total_amount: `£${totalAmount.toFixed(2)}`,
      pending_count: DUMMY_TRANSACTIONS.filter((t) => t.status === "pending")
        .length,
      completed_count: DUMMY_TRANSACTIONS.filter(
        (t) => t.status === "completed"
      ).length,
      failed_count: DUMMY_TRANSACTIONS.filter((t) => t.status === "failed")
        .length,
    };
  },

  /**
   * Get a single transaction by ID
   * NOTE: Using dummy data until API is implemented
   */
  getTransactionById: async (id: number): Promise<Transaction> => {
    await delay(300);

    const transaction = DUMMY_TRANSACTIONS.find((t) => t.id === id);

    if (!transaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    return transaction;
  },
};
