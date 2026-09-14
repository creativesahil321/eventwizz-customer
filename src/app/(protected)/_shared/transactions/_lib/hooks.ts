"use client";

import { useMemo, useState } from "react";
import { Transaction, TransactionFilters } from "./types";
import { useInfiniteTransactions } from "./queries";
import { transactionService } from "@/services/customer/transactions/transaction.service";

export const useTransactionSystem = () => {
  const [filters, setFilters] = useState<TransactionFilters>({
    status: "all",
    limit: 10,
  });

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const {
    data: transactionsResponse,
    isLoading: isLoadingTransactions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteTransactions(filters);

  const stats = useMemo(() => {
    const summary = transactionsResponse?.pages[0]?.summary;
    if (!summary) return undefined;
    return transactionService.mapSummaryToStats(summary);
  }, [transactionsResponse?.pages]);

  const transactions = useMemo(
    () =>
      transactionsResponse?.pages.flatMap((page) =>
        Array.isArray(page.data) ? page.data : [],
      ) ?? [],
    [transactionsResponse?.pages],
  );

  const isLoading = isLoadingTransactions;

  const handleFilterChange = (newFilters: Partial<TransactionFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
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
    filters,
    transactions,
    stats,
    selectedTransaction,
    isDetailsOpen,
    isLoading,
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
    handleFilterChange,
    handleViewDetails,
    handleCloseDetails,
  };
};
