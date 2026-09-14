"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { transactionService } from "@/services/customer/transactions/transaction.service";
import {
  TransactionFilters,
  TransactionStatus,
  TransactionsResponse,
} from "./types";

/**
 * Coalesces filter state so equivalent UI values share one cache entry
 * (e.g. missing search vs "", status "all" vs undefined).
 */
export function normalizeTransactionFilters(
  filters: TransactionFilters = {},
): TransactionFilters {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const search = (filters.search ?? "").trim();
  const payment_date = (filters.payment_date ?? "").trim();
  const status =
    !filters.status || filters.status === "all"
      ? "all"
      : filters.status;
  const payment_method =
    !filters.payment_method || filters.payment_method === "all"
      ? "all"
      : filters.payment_method;

  return {
    page,
    limit,
    ...(search ? { search } : {}),
    ...(payment_date ? { payment_date } : {}),
    status: status as TransactionStatus | "all",
    payment_method,
  };
}

// Query keys
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,
};

// Query hooks
export const useTransactions = (filters: TransactionFilters = {}) => {
  const normalized = normalizeTransactionFilters(filters);
  return useQuery<TransactionsResponse>({
    queryKey: transactionKeys.list(normalized),
    queryFn: () => transactionService.getTransactions(normalized),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useInfiniteTransactions = (filters: TransactionFilters = {}) => {
  const normalized = normalizeTransactionFilters({ ...filters, page: 1 });
  const { page: _ignoredPage, ...listKey } = normalized;

  return useInfiniteQuery<TransactionsResponse>({
    queryKey: transactionKeys.list(listKey),
    queryFn: ({ pageParam = 1 }) =>
      transactionService.getTransactions({
        ...normalized,
        page: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta || meta.current_page >= meta.last_page) return undefined;
      return meta.current_page + 1;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
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
