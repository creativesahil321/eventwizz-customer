/**
 * Bookings Query Hooks
 *
 * TanStack Query hooks for customer bookings.
 */

import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { bookingsService } from "./bookings.service";
import { resolveBookingPaymentAction } from "./booking-payment";
import {
  BookingsQueryParams,
  BookingsResponse,
  BookingItem,
  BookingDetailsResponse,
  MenuItemsResponse,
  MenuSelectionPayload,
  MenuSelectionResponse,
  SaveMenuChoicePayload,
  RescheduleDataResponse,
  RescheduleBookingPayload,
  RescheduleBookingResponse,
  BookingPaymentPayload,
  BookingPaymentResponse,
} from "./type";
// Toast notifications are handled at root level by API client interceptor

/**
 * Query key factory for bookings
 */
export const bookingsKeys = {
  all: ["customer", "bookings"] as const,
  lists: () => [...bookingsKeys.all, "list"] as const,
  list: (params?: BookingsQueryParams) =>
    [...bookingsKeys.lists(), params] as const,
  details: () => [...bookingsKeys.all, "detail"] as const,
  detail: (id: number) => [...bookingsKeys.details(), id] as const,
  bookingDetails: () => [...bookingsKeys.all, "booking-details"] as const,
  bookingDetail: (id: number) =>
    [...bookingsKeys.bookingDetails(), id] as const,
  menuItems: () => [...bookingsKeys.all, "menu-items"] as const,
  menuItem: (
    bookingId: number,
    date: string,
    tableId?: number,
    roomId?: number | null,
  ) => {
    const resolvedRoomId =
      roomId != null && Number(roomId) > 0 ? Number(roomId) : undefined;
    return [
      ...bookingsKeys.menuItems(),
      bookingId,
      resolvedRoomId ?? "flat",
      date,
      tableId,
    ] as const;
  },
  rescheduleDates: () => [...bookingsKeys.all, "reschedule-dates"] as const,
  rescheduleDate: (bookingId: number, bookingDateId: number) =>
    [...bookingsKeys.rescheduleDates(), bookingId, bookingDateId] as const,
};

/**
 * Marks all customer booking list queries stale and refetches active ones.
 * Call after checkout or payment so /customer/bookings shows the new booking.
 */
export function invalidateCustomerBookingsList(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: bookingsKeys.lists(),
    refetchType: "active",
  });
}

/**
 * Hook to fetch bookings list
 */
export const useBookings = (params?: BookingsQueryParams) => {
  return useQuery<BookingsResponse>({
    queryKey: bookingsKeys.list(params),
    queryFn: () => bookingsService.getBookings(params),
    staleTime: 0,
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnMount: "always",
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
};

/**
 * Hook to fetch a single booking
 */
export const useBooking = (id: number, enabled = true) => {
  return useQuery<BookingItem>({
    queryKey: bookingsKeys.detail(id),
    queryFn: () => bookingsService.getBooking(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch booking details
 */
export const useBookingDetails = (id: number, enabled = true) => {
  return useQuery<BookingDetailsResponse>({
    queryKey: bookingsKeys.bookingDetail(id),
    queryFn: () => bookingsService.getBookingDetails(id),
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
};

/**
 * Hook to fetch menu items for a booking, date, and table
 * Query key includes tableId - switching tables triggers a fresh fetch automatically
 * Cached data is reused when switching back to a previously viewed table
 */
export const useMenuItems = (
  bookingId: number,
  date: string,
  tableId?: number,
  enabled = true,
  roomId?: number | null,
) => {
  const resolvedRoomId =
    roomId != null && Number(roomId) > 0 ? Number(roomId) : undefined;

  return useQuery<MenuItemsResponse>({
    queryKey: bookingsKeys.menuItem(bookingId, date, tableId, resolvedRoomId),
    queryFn: () => {
      if (!tableId) {
        throw new Error("Table ID is required to fetch menu items");
      }
      return bookingsService.getMenuItems(
        bookingId,
        date,
        tableId,
        resolvedRoomId,
      );
    },
    enabled: enabled && !!bookingId && !!date && !!tableId,
    staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh, prevents duplicate calls
    gcTime: 10 * 60 * 1000, // 10 minutes - cache persists for switching back
  });
};

/**
 * Hook to submit menu selections (batch)
 * Note: Toast notifications are handled at root level by API client interceptor
 */
export const useSubmitMenuSelections = () => {
  const queryClient = useQueryClient();

  return useMutation<MenuSelectionResponse, Error, MenuSelectionPayload>({
    mutationFn: (payload) => bookingsService.submitMenuSelections(payload),
    onSuccess: (response, variables) => {
      // Check if response has errors - let root level handle toast
      if (response.errors && response.errors.length > 0) {
        return;
      }

      // Invalidate menu items query to refetch updated data
      queryClient.invalidateQueries({
        queryKey: bookingsKeys.menuItem(variables.booking_id, variables.date),
      });
      // Also invalidate booking details
      queryClient.invalidateQueries({
        queryKey: bookingsKeys.bookingDetail(variables.booking_id),
      });
      // Toast notifications handled at root level by API client interceptor
    },
    onError: () => {
      // Error toast notifications handled at root level by API client interceptor
    },
  });
};

/**
 * Hook to save a single menu choice immediately
 * Note: Toast notifications are handled at root level by TanStack Query
 */
export const useSaveMenuChoice = () => {
  const queryClient = useQueryClient();

  return useMutation<MenuSelectionResponse, Error, SaveMenuChoicePayload>({
    mutationFn: (payload) => bookingsService.saveMenuChoice(payload),
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
          // Key format: ["customer", "bookings", "menu-items", bookingId, date, tableId]
          return (
            Array.isArray(key) &&
            key.length >= 4 &&
            key[0] === "customer" &&
            key[1] === "bookings" &&
            key[2] === "menu-items" &&
            key[3] === variables.booking_id
          );
        },
      });
      // Also invalidate booking details
      queryClient.invalidateQueries({
        queryKey: bookingsKeys.bookingDetail(variables.booking_id),
      });
      // Toast notifications handled at root level by TanStack Query
    },
    onError: () => {
      // Error toast notifications handled at root level by TanStack Query
    },
  });
};

/**
 * Hook to fetch reschedule data (current date, payment gateways, and available dates)
 */
export const useRescheduleData = (
  bookingId: number,
  bookingDateId: number,
  enabled = true
) => {
  return useQuery<RescheduleDataResponse>({
    queryKey: bookingsKeys.rescheduleDate(bookingId, bookingDateId),
    queryFn: () => bookingsService.getRescheduleData(bookingId, bookingDateId),
    enabled: enabled && !!bookingId && !!bookingDateId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

/**
 * Hook to reschedule a booking date
 * Handles payment gateway redirect if payment is required
 */
export const useRescheduleBooking = () => {
  const queryClient = useQueryClient();

  return useMutation<
    RescheduleBookingResponse,
    Error,
    RescheduleBookingPayload
  >({
    mutationFn: (payload) => bookingsService.rescheduleBooking(payload),
    onSuccess: (response, variables) => {
      if (response.status) {
        // Check if payment gateway redirect is required
        if (response.data?.payment?.redirect_url) {
          console.log("🔄 Redirecting to payment gateway for reschedule:", {
            gateway: response.data.payment_gateway,
            rescheduleRequestId: response.data.reschedule_request_id,
            unpaidAmount: response.data.unpaid_amount,
            redirectUrl: response.data.payment.redirect_url,
          });

          // Redirect to the payment gateway URL provided by backend
          window.location.href = response.data.payment.redirect_url;
          return;
        }

        // If no payment required, invalidate and refetch booking data
        // Invalidate booking details to refetch updated data
        queryClient.invalidateQueries({
          queryKey: bookingsKeys.bookingDetail(variables.booking_id),
        });
        // Refetch active booking details immediately
        queryClient.refetchQueries({
          queryKey: bookingsKeys.bookingDetail(variables.booking_id),
          type: "active",
        });
        // Invalidate reschedule dates cache for this booking
        queryClient.invalidateQueries({
          queryKey: bookingsKeys.rescheduleDates(),
        });
        // Invalidate bookings list to update status
        queryClient.invalidateQueries({
          queryKey: bookingsKeys.lists(),
        });
      }
    },
  });
};

/**
 * Hook to process booking payment
 * Handles payment gateway redirect when payment is required
 */
export const useBookingPayment = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BookingPaymentResponse,
    Error,
    BookingPaymentPayload
  >({
    mutationFn: (payload) => bookingsService.processBookingPayment(payload),
    onSuccess: (response, variables) => {
      if (!response.status || !response.data) return;

      const action = resolveBookingPaymentAction(response.data);
      if (action?.type === "redirect") {
        window.location.href = action.url;
        return;
      }

      // Stripe modal is opened by the caller when action.type === "stripe"
      if (action?.type === "stripe") {
        return;
      }

      // Invalidate booking details to refetch updated data
      queryClient.invalidateQueries({
        queryKey: bookingsKeys.bookingDetail(variables.booking_id),
      });
      queryClient.refetchQueries({
        queryKey: bookingsKeys.bookingDetail(variables.booking_id),
        type: "active",
      });
      queryClient.invalidateQueries({
        queryKey: bookingsKeys.lists(),
      });
    },
  });
};
