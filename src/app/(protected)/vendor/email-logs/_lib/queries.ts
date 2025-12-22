import {
  useQuery,
  keepPreviousData,
  QueryOptions,
} from "@tanstack/react-query";
import { fetchEmailLogs } from "./actions";
import { UseEmailLogQueryParams } from "./types";

export const useEmailLogs = (params: UseEmailLogQueryParams = {}) => {
  const {
    search = "",
    page = 1,
    per_page = 30,
    status = "",
    options = {},
  } = params;

  return useQuery({
    queryKey: ["vendor-email-logs", search, page, per_page, status],
    queryFn: async () => {
      const menus = await fetchEmailLogs({
        search,
        page,
        per_page,
        status,
      });
      return {
        status: 200,
        data: menus,
        error: [],
        message: "Menu choices fetched successfully.",
      };
    },
    placeholderData: keepPreviousData,
    ...options,
  });
};
