"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { menuChoicesService } from "@/services/vendor/menu_choices";
import { UseMenuChoicesQueryParams } from "../_lib/types";

export const menuChoicesKeys = {
  all: ["menu-choices"] as const,
  lists: () => [...menuChoicesKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...menuChoicesKeys.lists(), filters] as const,
};

/** Customer menu choices list with server-side pagination and search */
export const useCustomerMenuChoicesList = (
  params: UseMenuChoicesQueryParams = {}
) => {
  const {
    search = "",
    page = 1,
    per_page = 30,
    event_type = "",
    menu = "",
    status = "",
    event_id,
    event_date,
    event_name,
    options = {},
  } = params;

  return useQuery({
    queryKey: menuChoicesKeys.list({
      search,
      page,
      per_page,
      event_type,
      menu,
      status,
      event_id,
      event_date,
      event_name,
    }),
    queryFn: async () => {
      const response = await menuChoicesService.getCustomerMenuChoices({
        search: search || undefined,
        page: Number(page),
        per_page: Number(per_page),
        event_id,
        event_date: event_date || undefined,
        event_name: event_name || undefined,
      });
      return {
        status: response.status,
        message: response.message,
        data: response.data ?? [],
        links: response.links,
        meta: response.meta,
        errors: response.errors ?? [],
        events_with_dates: response.events_with_dates ?? [],
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    ...options,
  });
};
