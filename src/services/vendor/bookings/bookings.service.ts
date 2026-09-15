/**
 * Vendor Bookings Service
 * Handles API calls related to vendor booking history
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import axios from "axios";
import { env } from "@/env";
import { useAuthStore } from "@/store/auth.store";
import { useDomainStore } from "@/store/domain.store";
import { getSession } from "next-auth/react";
import type {
  BookingDetailsDate,
  BookingPaymentSummary,
  MenuItemsResponse,
  MenuSelectionResponse,
  SaveMenuChoicePayload,
} from "@/services/customer/bookings/type";
import type {
  VendorRescheduleDataResponse,
  VendorRescheduleBookingPayload,
  VendorUpdateBookingStatusPayload,
  VendorUpdateBookingStatusResponse,
  DoorEntryScanData,
  DoorEntryScanResponse,
  DoorEntryCheckInPayload,
  DoorEntryCheckInResponse,
} from "./type";

export interface VendorBookingRoomFilterOption {
  room_id: number;
  room_name: string;
}

export interface VendorBookingFilterMeta {
  from_date?: string | null;
  to_date?: string | null;
  date_filter_on?: string | null;
  has_room_bookings?: boolean;
  room_scope?: string | null;
  selected_room_id?: number | null;
  selected_room_name?: string | null;
  available_rooms?: VendorBookingRoomFilterOption[];
}

export interface VendorBookingHistoryResponse {
  status: boolean;
  message: string;
  data: VendorBookingItem[];
  summary?: {
    total_amount: string;
    deposit_amount: string;
    pending_amount: string;
    total_platform_fee?: string;
    refunded_amount?: string;
    platform_fee_due?: string;
    platform_fee_settled?: string;
  };
  summary_by_location?: unknown[];
  filter_meta?: VendorBookingFilterMeta;
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    path: string;
    links: Array<{
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }>;
  };
}

export interface VendorBookingEventDateEntry {
  date: string;
  room_name?: string;
}

export interface VendorBookingItem {
  booking_id: number;
  booking_number: string; // Booking number (e.g., "EV-007")
  event_id: number;
  event_name: string;
  user_id: number;
  user_name: string;
  booking_date: string; // Format: "05-11-2025"
  /** Event dates — objects with display `date` and optional `room_name`. */
  event_date: VendorBookingEventDateEntry[];
  amount: string; // Format: "5800.00" — full booking amount when unscoped
  /** Present only when > 0; string like "1500.00". */
  saved_amount?: string;
  /** Present only when a coupon was used. */
  coupon_code?: string;
  status: string; // "Pending", "Confirmed", etc.
  platform_fee?: string; // Format: "15.00"
  deposit_amount?: string; // Format: "400.00"
  pending_amount?: string; // Format: "4070.00"
  room_id?: number | null;
  room_name?: string | null;
}

// Vendor Booking Detail Types
export interface VendorBookingUser {
  full_name: string;
  email: string;
  phone?: string | null; // Phone number is optional
}

export interface VendorBookingTable {
  table_size: number;
  price_per_person: number;
  no_tables: number;
  allocation:
  | Record<string, number | string>
  | Array<{
    id?: number;
    table_number?: number | string;
    final_table_number?: number | string;
    parent_id?: number;
    seats?: number;
  }>;
  people: number;
  total: number;
}

export interface VendorBookingTicket {
  id: number;
  title: string;
  description: string;
  price_per_ticket: number;
  quantity: number;
  total: number;
}

export interface VendorBookingDrink {
  id: number;
  title: string;
  price: number;
  quantity: number;
  total: number;
}

export interface VendorBookingAddons {
  tables: VendorBookingTable[];
  tickets: VendorBookingTicket[];
  drinks: VendorBookingDrink[];
  total_amount: number;
}

export interface VendorBookingParentDate {
  booking_date_id: number;
  date_key: string;
  date: string;
  total_amount: number;
  paid_amount: number;
  pending_payment: number;
  tables: VendorBookingTable[];
  tickets: VendorBookingTicket[];
  drinks: VendorBookingDrink[];
  addons: VendorBookingAddons;
}

export interface VendorBookingEventDate {
  has_unbooked_event_dates: boolean;
  booking_date_id: number;
  date_key: string;
  date: string;
  payment_status: string;
  total_amount: number;
  paid_amount: number;
  pending_payment: number;
  /** Present only when this date has promo savings. */
  saved_amount?: number;
  tables: VendorBookingTable[];
  tickets: VendorBookingTicket[];
  drinks: VendorBookingDrink[];
  addons: VendorBookingAddons;
  parent_booking_date?: string | VendorBookingParentDate | null;
}

export interface VendorStatusOption {
  value: number;
  label: string;
}

export type VendorBookingDetailDate = BookingDetailsDate & {
  vendor_status_options?: VendorStatusOption[];
  /** When true, vendor chooses online/offline when saving add-ons. */
  show_payment_mode_option?: boolean;
  /** Default payment mode when `show_payment_mode_option` is false. */
  unpaid_addon_payment_mode?: "online" | "offline" | string;
};

export interface VendorBookingComment {
  authorName: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface VendorBookingDetail {
  booking_id: number;
  booking_number: string;
  user: VendorBookingUser;
  event_name: string;
  event_slug?: string;
  location: string;
  is_room_system?: boolean;
  is_menu_choice?: boolean;
  /** Whole-booking order status (e.g. Cancelled, Confirmed) */
  status?: string;
  /** API-driven — when false, reschedule must not be offered */
  can_reschedule?: boolean;
  has_unbooked_event_dates?: boolean;
  payment_status_code?: number;
  payment_status_label: string;
  reschedule_status?: boolean;
  /** True when a vendor-initiated reschedule is in progress on any date */
  reschedule_initiated?: boolean;
  reschedule_count?: number;
  dates?: VendorBookingDetailDate[];
  payment_summary?: BookingPaymentSummary;
  comments?: VendorBookingComment[];
  /** @deprecated legacy detail shape */
  slug?: string;
  drink_title?: string;
  payment_status?: string;
  payment_gateways?: string[] | { id: number; slug: string }[];
  sub_total?: number;
  addons_amount?: number | null;
  deposit_paid?: number | null;
  paid_amount?: number;
  pending_payment?: number | null;
  total?: number;
  event_dates?: VendorBookingEventDate[];
}

export interface VendorBookingDetailResponse {
  status: boolean;
  message: string;
  data: VendorBookingDetail;
  errors: string[];
}

export interface VendorBookingsQueryParams {
  page?: number | string;
  per_page?: number | string;
  status?: string;
  search?: string;
  event_date?: string;
  from_date?: string;
  to_date?: string;
  room_id?: number | string;
}

/**
 * Vendor Bookings Service
 */
export const vendorBookingsService = {
  /**
   * Fetch all bookings with optional search parameters
   * @param params Search parameters (page, per_page, status, search)
   * @returns Promise with bookings data
   */
  getBookings: (params?: VendorBookingsQueryParams) => {
    return api.get<VendorBookingHistoryResponse>(
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.GET_ALL,
      {
        params,
        returnFullResponse: true,
      }
    );
  },

  /**
   * Fetch a specific booking by ID
   * @param id Booking ID
   * @returns Promise with booking data
   */
  getBookingById: (id: number | string) => {
    const url = API_ENDPOINTS.VENDOR.BOOKING_HISTORY.GET_BY_ID.replace(
      "{id}",
      id.toString()
    );
    return api.get<VendorBookingDetailResponse>(url, {
      returnFullResponse: true,
    });
  },

  /**
   * Add a note/comment to a booking
   * @param bookingId - The booking ID
   * @param content - Note content
   * @returns Promise with response
   */
  addBookingNote: async (
    bookingId: number | string,
    content: string
  ): Promise<{ status: boolean; message: string; data?: unknown }> => {
    const url = API_ENDPOINTS.VENDOR.BOOKING_HISTORY.NOTES.CREATE.replace(
      "{id}",
      String(bookingId)
    );
    return api.post<{ status: boolean; message: string; data?: unknown }>(
      url,
      { content: content.trim() },
      { returnFullResponse: true }
    );
  },

  /**
   * Fetch menu items for a booking, date, and table
   * @param bookingId Booking ID
   * @param date Date key (e.g., "2025-09-20")
   * @param tableId Table ID
   * @returns Promise with menu items data
   */
  getMenuItems: async (
    bookingId: number,
    date: string,
    tableId: number
  ): Promise<MenuItemsResponse> => {
    const endpoint = API_ENDPOINTS.VENDOR.MENU_CHOICES.ADD_MENU.replace(
      "{id}",
      bookingId.toString()
    )
      .replace("{date}", date)
      .replace("{table_id}", tableId.toString());
    return api.get<MenuItemsResponse>(endpoint, {
      returnFullResponse: true,
    });
  },

  /**
   * Save a single menu choice (immediate save)
   * @param payload Menu choice data
   * @returns Promise with response
   */
  saveMenuChoice: async (
    payload: SaveMenuChoicePayload
  ): Promise<MenuSelectionResponse> => {
    return api.post<MenuSelectionResponse>(
      API_ENDPOINTS.VENDOR.MENU_CHOICES.SAVE_MENU_CHOICES,
      payload,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Delete add-ons for a booking
   * @param bookingId - The booking ID
   * @param date - The date key (e.g., "2025-09-20")
   * @param keyword - For tables: table size, For drinks/tickets: item id
   * @param type - Type of add-on: "tables", "drinks", or "tickets"
   * @returns Promise with response
   */
  deleteAddOns: async (
    bookingId: number,
    date: string,
    keyword: string | number,
    type: "tables" | "drinks" | "tickets"
  ): Promise<{ status: boolean; message: string }> => {
    const endpoint =
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.ADD_ONS.DELETE_ADD_ONS.replace(
        "{id}",
        bookingId.toString()
      )
        .replace("{date}", date)
        .replace("{keyword}", keyword.toString())
        .replace("{type}", type);
    return api.delete<{ status: boolean; message: string }>(endpoint, {
      returnFullResponse: true,
    });
  },

  /**
   * Get reschedule data for a booking date (current date info, available dates)
   * Vendor response has separate arrays for directly available dates and dates needing tables
   * @param bookingId - The booking ID
   * @param bookingDateId - The booking date ID
   * @returns Promise with vendor reschedule data
   */
  getRescheduleData: async (
    bookingId: number,
    bookingDateId: number
  ): Promise<VendorRescheduleDataResponse> => {
    const endpoint =
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.RESCHEDULE_BOOKING.GET_DATA.replace(
        "{booking_id}",
        bookingId.toString()
      ).replace("{date_id}", bookingDateId.toString());
    return api.get<VendorRescheduleDataResponse>(endpoint, {
      returnFullResponse: true,
    });
  },

  /**
   * Reschedule a booking date
   * @param payload - The vendor reschedule booking payload with all required data
   * @returns Promise with response
   */
  rescheduleBooking: async (
    payload: VendorRescheduleBookingPayload
  ): Promise<{ status: boolean; message: string; data?: unknown }> => {
    const endpoint =
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.RESCHEDULE_BOOKING.SAVE;
    return api.post<{ status: boolean; message: string; data?: unknown }>(
      endpoint,
      payload,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Export menu choices as CSV file
   * @param bookingId - The booking ID
   * @param date - The date key (e.g., "2025-09-20")
   * @returns Promise that triggers file download
   */
  exportMenuChoices: async (bookingId: number, date: string): Promise<void> => {
    const endpoint =
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.MENU_CHOICES.EXPORT_MENU_CHOICES.replace(
        "{id}",
        bookingId.toString()
      ).replace("{date}", date);

    // Get token from auth store
    const token = useAuthStore.getState().token;

    // Get domain from domain store
    const domain = useDomainStore.getState().domain;

    // Get location ID from session
    const session = await getSession();
    const locationId = session?.user?.vendor_location_id;

    // Build headers with required domain and location headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (domain) {
      headers["X-Domain"] = domain;
    }

    if (locationId) {
      headers["X-Venue-Location-Id"] = String(locationId);
    }

    // Use axios directly for blob download
    const response = await axios.get<Blob>(
      `${env.NEXT_PUBLIC_API_URL}${endpoint}`,
      {
        responseType: "blob",
        headers,
      }
    );

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers?.["content-disposition"];
    let filename = `menu-choices-${bookingId}-${date}.csv`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Update booking status (payment status)
   * @param payload Booking status update payload
   * @returns Promise with updated booking status
   */
  updateBookingStatus: async (
    payload: VendorUpdateBookingStatusPayload
  ): Promise<VendorUpdateBookingStatusResponse> => {
    return api.put<VendorUpdateBookingStatusResponse>(
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.UPDATE_STATUS,
      payload,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Decode a door-entry QR payload. Auth + `X-Venue-Location-Id` come from the
   * shared Axios client. Callers should suppress interceptor toasts and map `code`.
   */
  scanDoorEntry: async (token: string): Promise<DoorEntryScanData> => {
    const response = await api.post<DoorEntryScanResponse>(
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.DOOR_ENTRY.SCAN,
      { token },
      {
        returnFullResponse: true,
        suppressErrorToast: true,
        suppressSuccessToast: true,
      }
    );

    if (!response.status || !response.data) {
      const error = new Error(response.message || "Unable to read this QR code");
      (error as Error & { code?: string }).code = response.code;
      throw error;
    }

    return normalizeDoorEntryScan(response.data);
  },

  /**
   * Admit the whole booking for one date. Requires `update-booking`.
   */
  checkInDoorEntry: async (
    payload: DoorEntryCheckInPayload
  ): Promise<DoorEntryCheckInResponse> => {
    const response = await api.post<DoorEntryCheckInResponse>(
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.DOOR_ENTRY.CHECK_IN,
      payload,
      {
        returnFullResponse: true,
        suppressErrorToast: true,
        suppressSuccessToast: true,
      }
    );

    if (!response.status) {
      const error = new Error(response.message || "Check-in failed");
      (error as Error & { code?: string }).code = response.code;
      throw error;
    }

    return response;
  },

  /**
   * Bulk delete bookings
   * @param bookingIds Array of booking IDs to delete
   * @returns Promise with bulk delete operation result
   */
  bulkDeleteBookings: async (
    bookingIds: (number | string)[]
  ): Promise<{ status: boolean; message: string; data: unknown }> => {
    if (
      !API_ENDPOINTS.VENDOR.BOOKING_HISTORY.MULTIPLE_ACTIONS?.BULK_DELETE
    ) {
      throw new Error("BULK_DELETE endpoint not configured for bookings");
    }

    // Format payload as FormData with array notation: booking_ids[0]:47, booking_ids[1]:63, etc.
    const formData = new FormData();
    bookingIds.forEach((id, index) => {
      formData.append(`booking_ids[${index}]`, id.toString());
    });

    return api.post<{ status: boolean; message: string; data: unknown }>(
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.MULTIPLE_ACTIONS.BULK_DELETE,
      formData,
      {
        returnFullResponse: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  },

  /**
   * Bulk send email to selected bookings
   * @param bookingIds Array of booking IDs to send email to
   * @param subject Email subject
   * @param body Email body (can contain placeholders like {name})
   * @returns Promise with bulk email send result
   */
  bulkEmailSend: async (
    bookingIds: (number | string)[],
    subject: string,
    body: string
  ): Promise<{ status: boolean; message: string; data: unknown }> => {
    if (
      !API_ENDPOINTS.VENDOR.BOOKING_HISTORY.MULTIPLE_ACTIONS?.BULK_EMAIL_SEND
    ) {
      throw new Error(
        "BULK_EMAIL_SEND endpoint not configured for bookings"
      );
    }

    // Format payload as FormData with array notation: booking_ids[0]:41, booking_ids[1]:42, etc.
    const formData = new FormData();
    bookingIds.forEach((id, index) => {
      formData.append(`booking_ids[${index}]`, id.toString());
    });
    formData.append("subject", subject);
    formData.append("body", body);

    return api.post<{ status: boolean; message: string; data: unknown }>(
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.MULTIPLE_ACTIONS.BULK_EMAIL_SEND,
      formData,
      {
        returnFullResponse: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  },

  /**
   * Bulk export bookings to CSV
   * @param bookingIds Array of booking IDs to export
   * @param date Export date filter (format: YYYY-MM-DD)
   * @returns Promise that triggers file download
   */
  bulkExportBookings: async (
    bookingIds: (number | string)[],
    date: string
  ): Promise<void> => {
    if (
      !API_ENDPOINTS.VENDOR.BOOKING_HISTORY.MULTIPLE_ACTIONS?.BULK_EXPORT
    ) {
      throw new Error("BULK_EXPORT endpoint not configured for bookings");
    }

    // Get token from auth store
    const token = useAuthStore.getState().token;

    // Get domain from domain store
    const domain = useDomainStore.getState().domain;

    // Get location ID from session
    const session = await getSession();
    const locationId = session?.user?.vendor_location_id;

    // Build headers with required domain and location headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (domain) {
      headers["X-Domain"] = domain;
    }

    if (locationId) {
      headers["X-Venue-Location-Id"] = String(locationId);
    }

    // Build FormData payload
    const formData = new FormData();
    bookingIds.forEach((id, index) => {
      formData.append(`booking_ids[${index}]`, id.toString());
    });
    formData.append("date", date);

    try {
      // Use axios directly for blob download (bypasses apiClient toast interceptors)
      const response = await axios.post<Blob>(
        `${env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.VENDOR.BOOKING_HISTORY.MULTIPLE_ACTIONS.BULK_EXPORT}`,
        formData,
        {
          responseType: "blob",
          headers,
        }
      );

      // API may return JSON error body with HTTP 200 while responseType is blob
      await throwIfBlobIsApiError(
        response.data,
        response.headers?.["content-type"]
      );

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers?.["content-disposition"];
      let filename = `bookings-export-${date}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      // Non-2xx responses also arrive as blobs; surface the API message
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        await throwIfBlobIsApiError(
          error.response.data,
          error.response.headers?.["content-type"],
          true
        );
      }
      throw error;
    }
  },
};

function coerceDoorEntryId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeDoorEntryScan(raw: DoorEntryScanData): DoorEntryScanData {
  const suggested = coerceDoorEntryId(raw.suggested_booking_date_id);

  return {
    booking_id: coerceDoorEntryId(raw.booking_id) ?? 0,
    booking_number: String(raw.booking_number ?? "").trim(),
    guest_name: String(raw.guest_name ?? "").trim(),
    event_name: String(raw.event_name ?? "").trim(),
    suggested_booking_date_id: suggested,
    dates: (raw.dates ?? [])
      .map((row) => ({
        booking_date_id: coerceDoorEntryId(row.booking_date_id) ?? 0,
        booking_date: String(row.booking_date ?? ""),
        room_name: row.room_name ? String(row.room_name) : null,
        entry_status: row.entry_status ? String(row.entry_status) : null,
        entry_label: String(row.entry_label ?? ""),
        can_check_in: row.can_check_in === true,
        checked_in_at: row.checked_in_at ? String(row.checked_in_at) : null,
      }))
      .filter((row) => row.booking_date_id > 0),
  };
}

/**
 * When responseType is "blob", JSON error payloads skip the apiClient interceptor.
 * Parse and throw so callers can toast the API message.
 */
async function throwIfBlobIsApiError(
  data: Blob,
  contentType?: string,
  forceParse = false
): Promise<void> {
  const type = (contentType || data.type || "").toLowerCase();
  const looksLikeJson =
    forceParse ||
    type.includes("application/json") ||
    type.includes("text/json");

  if (!looksLikeJson) return;

  let json: { status?: boolean; message?: string } | null = null;
  try {
    json = JSON.parse(await data.text()) as {
      status?: boolean;
      message?: string;
    };
  } catch {
    if (forceParse) {
      throw new Error("Failed to export bookings");
    }
    return;
  }

  if (json?.status === false || forceParse) {
    throw new Error(json?.message || "Something went wrong");
  }
}
