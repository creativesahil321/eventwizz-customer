import {
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { downloadBlob } from "@/lib/export";
import { adminTransactionsService } from "./transactions.service";
import type {
  AdminTransactionsExportParams,
  AdminTransactionsParams,
  AdminTransactionsResponse,
} from "./types";

export const adminTransactionsKeys = {
  all: ["admin", "transactions"] as const,
  list: (params: AdminTransactionsParams) =>
    [...adminTransactionsKeys.all, "list", params] as const,
};

export function useAdminTransactions(params: AdminTransactionsParams = {}) {
  const {
    page = 1,
    per_page = 30,
    search = "",
    status = "",
    from_date,
    to_date,
  } = params;

  return useQuery<AdminTransactionsResponse>({
    queryKey: adminTransactionsKeys.list({
      page,
      per_page,
      search,
      status,
      from_date,
      to_date,
    }),
    queryFn: () =>
      adminTransactionsService.getTransactions({
        page,
        per_page,
        search,
        status,
        from_date,
        to_date,
      }),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Downloads a single transaction receipt (PDF) by payment id — server blob.
 */
export function useDownloadAdminReceipt() {
  return useMutation({
    mutationFn: (paymentId: number | string) =>
      adminTransactionsService.downloadReceipt(paymentId),
    onSuccess: (blob, paymentId) => {
      downloadBlob(blob, `receipt-${paymentId}.pdf`);
    },
  });
}

/**
 * Exports admin transactions as CSV from the server for the given date range.
 */
export function useExportAdminTransactions() {
  return useMutation({
    mutationFn: (params: AdminTransactionsExportParams) =>
      adminTransactionsService.exportTransactions(params),
    onSuccess: (blob, params) => {
      downloadBlob(
        blob,
        `admin-transaction-history-${params.from_date}_${params.to_date}.csv`,
      );
    },
  });
}
