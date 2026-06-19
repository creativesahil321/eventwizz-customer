import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  fetchVendorTransactions,
  getSingleReceipt,
  exportAllReceiptsCSV,
  VendorTransactionsResponse,
} from "@/services/vendor/transactions";
import { TransactionsParams } from "./types";

const VENDOR_TRANSACTIONS_KEY = "vendor-transactions";

/**
 * Hook to fetch vendor transactions with pagination and filters (incl. date range)
 */
export const useVendorTransactions = (params: TransactionsParams = {}) => {
  const {
    search = "",
    page = 1,
    per_page = 30,
    status = "",
    booking_date = "",
    from_date,
    to_date,
    options = {},
  } = params;

  return useQuery<VendorTransactionsResponse>({
    queryKey: [
      VENDOR_TRANSACTIONS_KEY,
      search,
      page,
      per_page,
      status,
      booking_date,
      from_date,
      to_date,
    ],
    queryFn: async () => {
      const response = await fetchVendorTransactions({
        search,
        page: Number(page),
        per_page: Number(per_page),
        status,
        booking_date,
        from: from_date,
        to: to_date,
      });
      return response;
    },
    placeholderData: keepPreviousData,
    ...(options as Record<string, unknown>),
  });
};

/**
 * Triggers download of a single receipt by transaction id
 */
export const useDownloadSingleReceipt = () => {
  return useMutation({
    mutationFn: (id: number | string) => getSingleReceipt(id),
    onSuccess: (blob, id) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
};

/**
 * Export all receipts as CSV for the given date range (from, to)
 */
export const useExportAllReceiptsCSV = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { from: string; to: string }) =>
      exportAllReceiptsCSV(payload),
    onSuccess: (blob, { from, to }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipts-${from}-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [VENDOR_TRANSACTIONS_KEY] });
    },
  });
};
