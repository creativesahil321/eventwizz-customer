"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { menuChoicesService } from "@/services/vendor/menu_choices";
import type { CustomerMenuChoicesListResponse } from "@/services/vendor/menu_choices/type";
import type {
  VendorBookingFilterMeta,
  VendorBookingRoomFilterOption,
} from "@/services/vendor/bookings/bookings.service";
import { UseMenuChoicesQueryParams } from "../_lib/types";

export const menuChoicesKeys = {
  all: ["menu-choices"] as const,
  lists: () => [...menuChoicesKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...menuChoicesKeys.lists(), filters] as const,
};

function normalizeAvailableRooms(
  rooms: VendorBookingFilterMeta["available_rooms"],
): VendorBookingRoomFilterOption[] {
  if (!Array.isArray(rooms)) return [];

  return rooms
    .map((raw) => {
      const roomId =
        raw.room_id ?? (raw as { id?: number }).id;
      const roomName =
        raw.room_name ?? (raw as { name?: string }).name;

      if (roomId == null || !roomName) return null;

      return {
        room_id: Number(roomId),
        room_name: String(roomName),
      };
    })
    .filter((room): room is VendorBookingRoomFilterOption => room != null);
}

export type CustomerMenuChoicesQueryResult = CustomerMenuChoicesListResponse & {
  filter_meta?: VendorBookingFilterMeta;
};

/** Customer menu choices list with server-side pagination and search */
export const useCustomerMenuChoicesList = (
  params: UseMenuChoicesQueryParams = {},
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
    room_id,
    options = {},
  } = params;

  return useQuery<CustomerMenuChoicesQueryResult>({
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
      room_id,
    }),
    queryFn: async () => {
      const response = await menuChoicesService.getCustomerMenuChoices({
        search: search || undefined,
        page: Number(page),
        per_page: Number(per_page),
        event_id,
        event_date: event_date || undefined,
        event_name: event_name || undefined,
        room_id: room_id || undefined,
      });

      const filterMeta = response.filter_meta
        ? {
            ...response.filter_meta,
            available_rooms: normalizeAvailableRooms(
              response.filter_meta.available_rooms,
            ),
          }
        : undefined;

      return {
        status: response.status,
        message: response.message,
        data: response.data ?? [],
        links: response.links,
        meta: response.meta,
        errors: response.errors ?? [],
        events_with_dates: response.events_with_dates ?? [],
        filter_meta: filterMeta,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    ...options,
  });
};
