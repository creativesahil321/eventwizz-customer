import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchTickets } from "./mock-api";

export type QueryParams = {
  search?: string;
  page?: number | string;
  per_page?: number | string;
  event_type?: string;
  menu?: string;
  status?: string;
  options?: Record<string, string>;
};

export const useTickets = (params: QueryParams = {}) => {
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
      "vendor-tickets",
      search,
      page,
      per_page,
      event_type,
      menu,
      status,
    ],
    queryFn: async () => {
      const tickets = await fetchTickets(Number(params?.per_page));
      return {
        status: 200,
        data: tickets,
        error: [],
        message: "Support tickets fetched successfully.",
      };
    },
    placeholderData: keepPreviousData,
    ...options,
  });
};
