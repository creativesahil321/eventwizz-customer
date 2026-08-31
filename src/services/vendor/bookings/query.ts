/**
 * Vendor Bookings React Query Hooks
 * TanStack Query hooks for vendor booking management
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { vendorBookingsService } from "./bookings.service";
import type {
  MenuItemsResponse,
  MenuSelectionResponse,
  SaveMenuChoicePayload,
} from "@/services/customer/bookings/type";
import type {
  VendorRescheduleDataResponse,
  VendorRescheduleBookingPayload,
  VendorUpdateBookingStatusPayload,
  VendorUpdateBookingStatusResponse,
} from "./type";

/**
 * Query keys factory for vendor bookings
 */
export const vendorBookingsKeys = {
  all: ["vendor", "bookings"] as const,
  lists: () => [...vendorBookingsKeys.all, "list"] as const,
  list: (filters: string) => [...vendorBookingsKeys.lists(), filters] as const,
  details: () => [...vendorBookingsKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...vendorBookingsKeys.details(), id] as const,
  menuItems: () => [...vendorBookingsKeys.all, "menu-items"] as const,
  menuItem: (bookingId: number, date: string, tableId?: number) =>
    [...vendorBookingsKeys.menuItems(), bookingId, date, tableId] as const,
  rescheduleDates: () =>
    [...vendorBookingsKeys.all, "reschedule-dates"] as const,
  rescheduleDate: (bookingId: number, bookingDateId: number) =>
    [
      ...vendorBookingsKeys.rescheduleDates(),
      bookingId,
      bookingDateId,
    ] as const,
};

/**
 * Hook to fetch menu items for a booking, date, and table
 * Query key includes tableId - switching tables triggers a fresh fetch automatically
 * Cached data is reused when switching back to a previously viewed table
 */
export const useVendorMenuItems = (
  bookingId: number,
  date: string,
  tableId?: number,
  enabled = true
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Step 4 event saves broadcast this event. Refresh menu definitions when
    // the vendor returns to an already-open booking menu choices view.
    const handleEventDataChanged = () => {
      void queryClient.invalidateQueries({
        queryKey: vendorBookingsKeys.menuItems(),
      });
    };

    window.addEventListener("event-data-changed", handleEventDataChanged);
    return () => {
      window.removeEventListener("event-data-changed", handleEventDataChanged);
    };
  }, [queryClient]);

  return useQuery<MenuItemsResponse>({
    queryKey: vendorBookingsKeys.menuItem(bookingId, date, tableId),
    queryFn: () => {
      if (!tableId) {
        throw new Error("Table ID is required to fetch menu items");
      }
      return vendorBookingsService.getMenuItems(bookingId, date, tableId);
    },
    enabled: enabled && !!bookingId && !!date && !!tableId,
    // Menu definitions can change from the event editor. Do not reuse a
    // previously fetched definition when the vendor reopens this screen.
    staleTime: 0,
    gcTime: 10 * 60 * 1000, // 10 minutes - cache persists for switching back
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to save a single menu choice immediately
 * Note: Toast notifications are handled at root level by API client interceptor
 */
export const useSaveVendorMenuChoice = () => {
  const queryClient = useQueryClient();

  return useMutation<MenuSelectionResponse, Error, SaveMenuChoicePayload>({
    mutationFn: (payload) => vendorBookingsService.saveMenuChoice(payload),
    onSuccess: (response, variables) => {
      // Check if response has errors - let root level handle toast
      if (response.errors && response.errors.length > 0) {
        return;
      }

      // Invalidate menu items query to refetch updated data with new menu_choices
      // Invalidate all queries that start with menuItems for this booking_id
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          // Match all menu item queries for this booking_id
          // Key format: ["vendor", "bookings", "menu-items", bookingId, date, tableId]
          return (
            Array.isArray(key) &&
            key.length >= 4 &&
            key[0] === "vendor" &&
            key[1] === "bookings" &&
            key[2] === "menu-items" &&
            key[3] === variables.booking_id
          );
        },
      });
      // Also invalidate booking details
      queryClient.invalidateQueries({
        queryKey: vendorBookingsKeys.detail(variables.booking_id),
      });
      // Toast notifications handled at root level by API client interceptor
    },
    onError: () => {
      // Error toast notifications handled at root level by API client interceptor
    },
  });
};

/**
 * Hook to fetch reschedule data for a vendor booking date
 * Query key includes bookingId and bookingDateId
 */
export const useVendorRescheduleData = (
  bookingId: number,
  bookingDateId: number,
  enabled = true
) => {
  return useQuery<VendorRescheduleDataResponse>({
    queryKey: vendorBookingsKeys.rescheduleDate(bookingId, bookingDateId),
    queryFn: () =>
      vendorBookingsService.getRescheduleData(bookingId, bookingDateId),
    enabled: enabled && !!bookingId && !!bookingDateId,
    staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh
    gcTime: 5 * 60 * 1000, // 5 minutes - cache persists
    retry: 1, // Retry once on failure
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
};

/**
 * Hook to reschedule a vendor booking date
 * Note: Toast notifications are handled at root level by API client interceptor
 */
export const useVendorRescheduleBooking = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string; data?: unknown },
    Error,
    VendorRescheduleBookingPayload
  >({
    mutationFn: (payload) => vendorBookingsService.rescheduleBooking(payload),
    onSuccess: (response, variables) => {
      if (response.status) {
        // Invalidate booking details to refetch updated data
        queryClient.invalidateQueries({
          queryKey: ["vendor-booking-history", "detail", variables.booking_id],
        });
        // Refetch active booking details immediately
        queryClient.refetchQueries({
          queryKey: ["vendor-booking-history", "detail", variables.booking_id],
          type: "active",
        });
        // Invalidate reschedule dates cache for this booking
        queryClient.invalidateQueries({
          queryKey: vendorBookingsKeys.rescheduleDates(),
        });
        // Invalidate bookings list to update status
        queryClient.invalidateQueries({
          queryKey: ["vendor-booking-history", "list"],
        });
      }
      // Toast notifications handled at root level by API client interceptor
    },
    onError: () => {
      // Error toast notifications handled at root level by API client interceptor
    },
  });
};

/**
 * Hook to update booking status (payment status)
 * Note: Toast notifications are handled at root level by API client interceptor
 */
export const useUpdateVendorBookingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<
    VendorUpdateBookingStatusResponse,
    Error,
    VendorUpdateBookingStatusPayload
  >({
    mutationFn: (payload) =>
      vendorBookingsService.updateBookingStatus(payload),
    onSuccess: (response, variables) => {
      if (response.status) {
        // Invalidate booking details using the correct query key
        // The actual query key is: ["vendor-booking-history", "detail", bookingId]
        queryClient.invalidateQueries({
          queryKey: ["vendor-booking-history", "detail", variables.booking_id],
        });
        // Refetch active booking details immediately
        queryClient.refetchQueries({
          queryKey: ["vendor-booking-history", "detail", variables.booking_id],
          type: "active",
        });
        // Invalidate bookings list to update status
        queryClient.invalidateQueries({
          queryKey: ["vendor-booking-history", "list"],
        });
      }
      // Toast notifications handled at root level by API client interceptor
    },
    onError: () => {
      // Error toast notifications handled at root level by API client interceptor
    },
  });
};
