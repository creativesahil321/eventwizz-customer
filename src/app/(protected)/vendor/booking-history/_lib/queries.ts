import {
  useQuery,
  keepPreviousData,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  vendorBookingsService,
  VendorBookingHistoryResponse,
} from "@/services/vendor/bookings/bookings.service";
import { AdminHistoryParams, History } from "./types";

// Query keys for booking history
export const bookingHistoryKeys = {
  all: ["vendor-booking-history"] as const,
  lists: () => [...bookingHistoryKeys.all, "list"] as const,
  list: (filters: AdminHistoryParams) =>
    [...bookingHistoryKeys.lists(), filters] as const,
  details: () => [...bookingHistoryKeys.all, "detail"] as const,
  detail: (id: number | string) =>
    [...bookingHistoryKeys.details(), id] as const,
};

/**
 * Transform API booking item to History format
 */
const transformBookingItem = (
  item: VendorBookingHistoryResponse["data"][0]
): History => {
  // Get primary date (first from event_date array)
  const primaryDate =
    item.event_date && item.event_date.length > 0
      ? item.event_date[0]
      : item.booking_date;

  // Convert date format from "20-09-2025" to ISO string for consistency
  const convertDateToISO = (dateStr: string): string => {
    try {
      const [day, month, year] = dateStr.split("-");
      if (!day || !month || !year) {
        // If format is wrong, try parsing as is
        return new Date(dateStr).toISOString();
      }
      // Create date in YYYY-MM-DD format
      const date = new Date(`${year}-${month}-${day}`);
      if (isNaN(date.getTime())) {
        // Fallback to original string if parsing fails
        return dateStr;
      }
      return date.toISOString();
    } catch (error) {
      console.error("Error converting date:", dateStr, error);
      return dateStr; // Return original if conversion fails
    }
  };

  return {
    id: item.booking_id.toString(), // Use booking_id as id
    booking_id: item.booking_id,
    booking_number: item.booking_number, // Add booking_number from API
    event_id: item.event_id,
    event_name: item.event_name,
    user_name: item.user_name,
    user_id: item.user_id,
    booking_date: convertDateToISO(item.booking_date),
    date: convertDateToISO(primaryDate),
    event_dates:
      item.event_date.length > 1
        ? item.event_date.map(convertDateToISO)
        : undefined,
    amount: parseFloat(item.amount) || 0, // Convert string to number
    status: item.status,
    // Optional fields - set defaults if needed
    tickets: 0,
    total_table: 0,
    total_people: 0,
    paid_amount: 0,
    balance_amount: 0,
    discount: 0,
    total_amount: parseFloat(item.amount) || 0,
    payment_status: item.status, // Use status as payment_status for now
    deposit_amount: item.deposit_amount
      ? parseFloat(item.deposit_amount)
      : undefined,
    pending_amount: item.pending_amount
      ? parseFloat(item.pending_amount)
      : undefined,
  };
};

/**
 * Booking history response with transformed data
 */
export interface BookingHistoryResponse {
  status: boolean;
  message: string;
  data: History[];
  summary?: {
    total_amount: string;
    deposit_amount: string;
    pending_amount: string;
  };
  links: VendorBookingHistoryResponse["links"];
  meta: VendorBookingHistoryResponse["meta"];
  errors: string[];
}

type ExtendedUseQueryOptions<
  TData,
  TError,
  TQueryFnData,
  TQueryKey extends readonly unknown[]
> = UseQueryOptions<TData, TError, TQueryFnData, TQueryKey> & {
  keepPreviousData?: boolean;
};

/**
 * Hook to fetch booking history
 */
export const useHistory = (
  params: AdminHistoryParams = {},
  options?: ExtendedUseQueryOptions<
    BookingHistoryResponse,
    Error,
    BookingHistoryResponse,
    ReturnType<typeof bookingHistoryKeys.list>
  >
) => {
  const { search = "", page = 1, per_page = 30, status = "" } = params;

  return useQuery({
    queryKey: bookingHistoryKeys.list({
      search,
      page,
      per_page,
      status,
    }),
    queryFn: async () => {
      const response = await vendorBookingsService.getBookings({
        page: Number(page),
        per_page: Number(per_page),
        status: status || undefined,
        search: search || undefined,
      });

      // Transform API response to History format
      const transformedData = response.data.map(transformBookingItem);

      return {
        status: response.status,
        message: response.message,
        data: transformedData,
        summary: response.summary,
        links: response.links,
        meta: response.meta,
        errors: [],
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Hook to fetch vendor booking details by ID
 */
export const useVendorBookingDetails = (
  bookingId: number | string,
  enabled = true
) => {
  return useQuery({
    queryKey: bookingHistoryKeys.detail(bookingId),
    queryFn: () => vendorBookingsService.getBookingById(bookingId),
    enabled: enabled && !!bookingId,
    staleTime: 0,
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
};
