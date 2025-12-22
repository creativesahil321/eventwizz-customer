import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  fetchVendorTransactions,
  VendorTransactionsResponse,
} from "@/services/vendor/transactions";
import { TransactionsParams } from "./types";

/**
 * Hook to fetch vendor transactions with pagination and filters
 */
export const useVendorTransactions = (params: TransactionsParams = {}) => {
  const {
    search = "",
    page = 1,
    per_page = 30,
    status = "",
    booking_date = "",
    options = {},
  } = params;

  return useQuery<VendorTransactionsResponse>({
    queryKey: [
      "vendor-transactions",
      search,
      page,
      per_page,
      status,
      booking_date,
    ],
    queryFn: async () => {
      const response = await fetchVendorTransactions({
        search,
        page: Number(page),
        per_page: Number(per_page),
        status,
        booking_date,
      });
      return response;
    },
    placeholderData: keepPreviousData,
    ...(options as Record<string, unknown>),
  });
};
