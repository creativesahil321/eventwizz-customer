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

function listParams(params: AdminTransactionsParams): AdminTransactionsParams {
  return {
    page: params.page ?? 1,
    per_page: params.per_page ?? 30,
    search: params.search?.trim() || undefined,
    status: params.status?.trim().toLowerCase() || undefined,
    booking_date: params.booking_date || undefined,
    from_date: params.from_date || undefined,
    to_date: params.to_date || undefined,
    sort_by: params.sort_by,
    sort_dir: params.sort_dir,
  };
}

export function useAdminTransactions(params: AdminTransactionsParams = {}) {
  const queryParams = listParams(params);

  return useQuery<AdminTransactionsResponse>({
    queryKey: adminTransactionsKeys.list(queryParams),
    queryFn: () => adminTransactionsService.getTransactions(queryParams),
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

function exportFilename(params: AdminTransactionsExportParams): string {
  const from = params.booking_date ?? params.from_date ?? "from";
  const to = params.booking_date ?? params.to_date ?? from;
  return `transactions-${from}_to_${to}.csv`;
}

/**
 * Exports admin transactions as CSV from the server for the given date range.
 */
export function useExportAdminTransactions() {
  return useMutation({
    mutationFn: (params: AdminTransactionsExportParams) =>
      adminTransactionsService.exportTransactions(params),
    onSuccess: (blob, params) => {
      downloadBlob(blob, exportFilename(params));
    },
  });
}
