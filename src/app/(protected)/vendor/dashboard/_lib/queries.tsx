import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { fetchAdminDashboardOrders } from "./actions";
import { Booking } from "./types";
type OrderHistoryResponse = {
  status: number;
  data: {
    data: Booking[];
  };
  error: any[];
  message: string;
};

type DashboardBookingParams = {
  search?: string;
  per_page?: number | string | undefined;
  page?: number | string | undefined;
  status?: string;
  options?: any;
};
export const useDashboardBookings = (params: DashboardBookingParams) => {
  const { search, page, per_page, options = {} } = params;
  return useQuery<OrderHistoryResponse>({
    queryKey: ["admin-bookings", params],
    queryFn: async () => {
      const history = await fetchAdminDashboardOrders({
        search,
        page: page ? Number(page) : undefined,
        per_page: per_page ? Number(per_page) : undefined,
        status: "",
      });
      return {
        status: 200,
        data: history,
        error: [],
        message: "Orders fetched successfully.",
      };
    },
    placeholderData: keepPreviousData,
    ...options,
  });
};
