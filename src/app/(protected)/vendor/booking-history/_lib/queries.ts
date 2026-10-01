import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  vendorBookingsService,
  VendorBookingFilterMeta,
  VendorBookingHistoryResponse,
  VendorBookingRoomFilterOption,
  type VendorBookingEventDateEntry,
} from "@/services/vendor/bookings/bookings.service";
import { unnamedRoomLabel } from "@/lib/room-name-examples";
import {
  parseCouponCode,
  parseSavedAmount,
} from "@/lib/booking-saved-amount";
import { AdminHistoryParams, History, type HistoryEventDate } from "./types";

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
 * Normalize list API event_date entries (objects; tolerate legacy strings).
 */
function normalizeEventDateEntries(
  eventDate: VendorBookingHistoryResponse["data"][0]["event_date"] | unknown,
): HistoryEventDate[] {
  if (!Array.isArray(eventDate)) return [];

  return eventDate
    .map((entry): HistoryEventDate | null => {
      if (typeof entry === "string" && entry.trim()) {
        return { date: entry.trim() };
      }
      if (entry && typeof entry === "object") {
        const raw = entry as VendorBookingEventDateEntry;
        const date = typeof raw.date === "string" ? raw.date.trim() : "";
        if (!date) return null;
        const roomName =
          typeof raw.room_name === "string" ? raw.room_name.trim() : "";
        return roomName ? { date, room_name: roomName } : { date };
      }
      return null;
    })
    .filter((entry): entry is HistoryEventDate => entry != null);
}

/**
 * Convert API date strings to a sortable ISO value.
 * Supports legacy "dd-mm-yyyy" and display strings like "Friday, October 23, 2026".
 */
function toSortableDate(dateStr: string): string {
  const trimmed = dateStr.trim();
  if (!trimmed) return trimmed;

  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (dmy) {
    const [, day, month, year] = dmy;
    const date = new Date(`${year}-${month}-${day}T12:00:00`);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  return trimmed;
}

/**
 * Transform API booking item to History format
 */
const transformBookingItem = (
  item: VendorBookingHistoryResponse["data"][0],
): History => {
  const eventDates = normalizeEventDateEntries(item.event_date);
  const primaryDisplayDate =
    eventDates[0]?.date ?? item.booking_date;

  return {
    id: item.booking_id.toString(),
    booking_id: item.booking_id,
    booking_number: item.booking_number,
    event_id: item.event_id,
    event_name: item.event_name,
    user_name: item.user_name,
    user_id: item.user_id,
    booking_date: toSortableDate(item.booking_date),
    date: toSortableDate(primaryDisplayDate),
    event_dates: eventDates.length > 0 ? eventDates : undefined,
    amount: parseFloat(item.amount) || 0,
    saved_amount: parseSavedAmount(item.saved_amount),
    coupon_code: parseCouponCode(item.coupon_code),
    status: item.status,
    tickets: 0,
    total_table: 0,
    total_people: 0,
    paid_amount: 0,
    balance_amount: 0,
    discount: 0,
    total_amount: parseFloat(item.amount) || 0,
    payment_status: item.status,
    platform_fee: item.platform_fee ? parseFloat(item.platform_fee) : undefined,
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
    total_platform_fee?: string;
    refunded_amount?: string;
    platform_fee_due?: string;
  };
  filter_meta?: VendorBookingFilterMeta;
  links: VendorBookingHistoryResponse["links"];
  meta: VendorBookingHistoryResponse["meta"];
  errors: string[];
}

function normalizeAvailableRooms(
  rooms: VendorBookingFilterMeta["available_rooms"],
): VendorBookingRoomFilterOption[] {
  if (!Array.isArray(rooms)) return [];

  return rooms
    .map((room) => {
      const raw = room as {
        room_id?: number;
        id?: number;
        room_name?: string;
        name?: string;
      };
      const roomId = raw.room_id ?? raw.id;
      if (roomId == null || !Number.isFinite(Number(roomId))) return null;
      const roomName =
        raw.room_name?.trim() ||
        raw.name?.trim() ||
        unnamedRoomLabel();
      return {
        room_id: Number(roomId),
        room_name: roomName,
      };
    })
    .filter((room): room is VendorBookingRoomFilterOption => room != null);
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
  const {
    search = "",
    page = 1,
    per_page = 30,
    status = "",
    event_date = "",
    from_date,
    to_date,
    room_id,
  } = params;

  return useQuery({
    queryKey: bookingHistoryKeys.list({
      search,
      page,
      per_page,
      status,
      event_date,
      from_date,
      to_date,
      room_id,
    }),
    queryFn: async () => {
      const response = await vendorBookingsService.getBookings({
        page: Number(page),
        per_page: Number(per_page),
        status: status || undefined,
        search: search || undefined,
        event_date: event_date || undefined,
        from_date: from_date || undefined,
        to_date: to_date || undefined,
        room_id: room_id || undefined,
      });

      // Transform API response to History format
      const transformedData = response.data.map(transformBookingItem);

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
        data: transformedData,
        summary: response.summary,
        filter_meta: filterMeta,
        links: response.links,
        meta: response.meta,
        errors: [],
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000, // 1 minute — bookings change as customers pay
    refetchOnWindowFocus: true,
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

/**
 * Hook to add a note/comment to a booking
 */
export const useAddBookingNote = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string; data?: unknown },
    Error,
    { bookingId: number | string; content: string }
  >({
    mutationFn: ({ bookingId, content }) =>
      vendorBookingsService.addBookingNote(bookingId, content),
    onSuccess: (_, { bookingId }) => {
      const id = Number(bookingId);
      queryClient.invalidateQueries({ queryKey: bookingHistoryKeys.detail(id) });
      queryClient.refetchQueries({ queryKey: bookingHistoryKeys.detail(id) });
    },
    onError: (error: Error) => {
      console.error("Error adding booking note:", error);
    },
  });
};

/**
 * Hook to bulk delete bookings
 */
export const useBulkDeleteBookings = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string; data: unknown },
    Error,
    (number | string)[]
  >({
    mutationFn: async (bookingIds) => {
      return vendorBookingsService.bulkDeleteBookings(bookingIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingHistoryKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error bulk deleting bookings:", error);
    },
  });
};

/**
 * Hook to bulk send email to bookings
 */
export const useBulkEmailSend = () => {
  return useMutation<
    { status: boolean; message: string; data: unknown },
    Error,
    { bookingIds: (number | string)[]; subject: string; body: string }
  >({
    mutationFn: async ({ bookingIds, subject, body }) => {
      const response = await vendorBookingsService.bulkEmailSend(
        bookingIds,
        subject,
        body
      );
      return response;
    },
    onError: (error: Error) => {
      console.error("Error sending bulk email:", error);
    },
  });
};

/**
 * Hook to bulk export bookings to CSV
 */
export const useBulkExportBookings = () => {
  return useMutation<
    void,
    Error,
    { bookingIds: (number | string)[]; date: string }
  >({
    mutationFn: async ({ bookingIds, date }) => {
      await vendorBookingsService.bulkExportBookings(bookingIds, date);
    },
    onError: (error: Error) => {
      console.error("Error exporting bookings:", error);
    },
  });
};
