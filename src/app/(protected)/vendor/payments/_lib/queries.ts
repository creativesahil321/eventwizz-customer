import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchPayments } from "./actions";
import { PaymentsParams } from "./types";

export const usePayments = (params: PaymentsParams = {}) => {
  const {
    search = "",
    page = 1,
    per_page = 10,
    event_type = "",
    menu = "",
    status = "",
    options = {},
  } = params;

  return useQuery({
    queryKey: [
      "vendor-payments",
      search,
      page,
      per_page,
      event_type,
      menu,
      status,
    ],
    queryFn: async () => {
      const payments = await fetchPayments({
        search,
        page,
        per_page,
        event_type,
        menu,
        status,
      });
      return {
        status: 200,
        data: payments,
        error: [],
        message: "Payments fetched successfully.",
      };
    },
    placeholderData: keepPreviousData,
    ...options,
  });
};
