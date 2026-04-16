"use client";

import { useMemo, useState } from "react";
import {
  Transaction,
  TransactionFilters,
} from "./types";
import { useTransactions } from "./queries";
import { transactionService } from "@/services/customer/transactions/transaction.service";

export const useTransactionSystem = () => {
  const [filters, setFilters] = useState<TransactionFilters>({
    status: "all",
    page: 1,
    limit: 10,
  });

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Queries
  const {
    data: transactionsResponse,
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
  } = useTransactions(filters);

  const stats = useMemo(() => {
    if (!transactionsResponse?.summary) return undefined;
    return transactionService.mapSummaryToStats(transactionsResponse.summary);
  }, [transactionsResponse?.summary]);

  // Derived state
  const transactions = Array.isArray(transactionsResponse?.data)
    ? transactionsResponse.data
    : [];

  const meta = transactionsResponse?.meta as any;
  const isLoading = isLoadingTransactions;

  // Actions
  const handleFilterChange = (newFilters: Partial<TransactionFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedTransaction(null);
  };

  return {
    // State
    filters,
    transactions,
    meta,
    stats,
    selectedTransaction,
    isDetailsOpen,
    isLoading,

    // Actions
    handleFilterChange,
    handlePageChange,
    handleViewDetails,
    handleCloseDetails,
    refetchTransactions,
  };
};

