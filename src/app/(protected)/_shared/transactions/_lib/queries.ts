"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { transactionService } from "@/services/customer/transactions/transaction.service";
import { TransactionFilters, TransactionsResponse } from "./types";

// Query keys
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,
  stats: () => [...transactionKeys.all, "stats"] as const,
};

// Query hooks
export const useTransactions = (filters: TransactionFilters = {}) => {
  return useQuery<TransactionsResponse>({
    queryKey: transactionKeys.list(filters),
    queryFn: () => transactionService.getTransactions(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useTransactionStats = () => {
  return useQuery({
    queryKey: transactionKeys.stats(),
    queryFn: () => transactionService.getTransactionStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useTransactionById = (id: number) => {
  return useQuery({
    queryKey: [...transactionKeys.all, "detail", id],
    queryFn: () => transactionService.getTransactionById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};
