/**
 * Bookings Service
 *
 * Handles all API calls related to customer bookings.
 */

import axios from "axios";
import { api } from "../../core/api-client";
import { API_ENDPOINTS } from "../../core/endpoints";
import { backendProxyHeaders, backendProxyUrl } from "@/lib/backend/backend-transport";
import { useDomainStore } from "@/store/domain.store";
import {
  BookingsQueryParams,
  BookingsResponse,
  BookingItem,
  BookingDetailsResponse,
  AddOnsResponse,
  SaveAddOnsPayload,
  SaveAddOnsResponse,
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

export const bookingsService = {
  /**
   * Get a list of bookings for the customer
   */
  getBookings: async (
    params?: BookingsQueryParams
  ): Promise<BookingsResponse> => {
    return api.get<BookingsResponse>(API_ENDPOINTS.CUSTOMER.BOOKINGS.BOOKINGS, {
      params,
      returnFullResponse: true,
    });
  },

  /**
   * Get a single booking by ID
   */
  getBooking: async (id: number): Promise<BookingItem> => {
    return api.get<BookingItem>(
      `${API_ENDPOINTS.CUSTOMER.BOOKINGS.BOOKINGS}/${id}`,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Get booking details by booking_number (e.g. EV-080)
   */
  getBookingDetails: async (
    bookingNumber: string,
  ): Promise<BookingDetailsResponse> => {
    const endpoint = API_ENDPOINTS.CUSTOMER.BOOKINGS.BOOKING_DETAILS.replace(
      "{id}",
      encodeURIComponent(bookingNumber),
    );
    return api.get<BookingDetailsResponse>(endpoint, {
      returnFullResponse: true,
    });
  },

  /**
   * Get add-ons details for a specific booking and date.
   * Multi-room events include room_id in the path; flat events omit it.
   */
  getAddOnsDetails: async (
    bookingId: number,
    date: string,
    roomId?: number | null,
  ): Promise<AddOnsResponse> => {
    const resolvedRoomId =
      roomId != null && Number(roomId) > 0 ? Number(roomId) : undefined;

    const endpoint = resolvedRoomId
      ? API_ENDPOINTS.CUSTOMER.BOOKINGS.ADD_ONS_DETAILS.replace(
          "{id}",
          bookingId.toString(),
        )
          .replace("{room_id}", resolvedRoomId.toString())
          .replace("{date}", date)
      : API_ENDPOINTS.CUSTOMER.BOOKINGS.ADD_ONS_DETAILS_FLAT.replace(
          "{id}",
          bookingId.toString(),
        ).replace("{date}", date);

    return api.get<AddOnsResponse>(endpoint, {
      returnFullResponse: true,
    });
  },

  /**
   * Save add-ons for a booking
   */
  saveAddOns: async (
    payload: SaveAddOnsPayload | FormData
  ): Promise<SaveAddOnsResponse> => {
    return api.post<SaveAddOnsResponse>(
      API_ENDPOINTS.CUSTOMER.BOOKINGS.SAVE_ADDONS,
      payload,
      {
        returnFullResponse: true,
        headers:
          payload instanceof FormData
            ? {
              "Content-Type": "multipart/form-data",
            }
            : undefined,
      }
    );
  },

  /**
   * Get menu items for a specific booking, date, and table
   */
  getMenuItems: async (
    bookingId: number,
    date: string,
    tableId: number,
    roomId?: number | null,
  ): Promise<MenuItemsResponse> => {
    const resolvedRoomId =
      roomId != null && Number(roomId) > 0 ? Number(roomId) : undefined;

    const endpoint = resolvedRoomId
      ? API_ENDPOINTS.CUSTOMER.MENU_CHOICES.ADD_MENU_ROOM.replace(
          "{id}",
          bookingId.toString(),
        )
          .replace("{room_id}", resolvedRoomId.toString())
          .replace("{date}", date)
          .replace("{table_id}", tableId.toString())
      : API_ENDPOINTS.CUSTOMER.MENU_CHOICES.ADD_MENU.replace(
          "{id}",
          bookingId.toString(),
        )
          .replace("{date}", date)
          .replace("{table_id}", tableId.toString());

    return api.get<MenuItemsResponse>(endpoint, {
      returnFullResponse: true,
    });
  },

  /**
   * Submit menu selections for a booking (batch)
   */
  submitMenuSelections: async (
    payload: MenuSelectionPayload
  ): Promise<MenuSelectionResponse> => {
    const endpoint = API_ENDPOINTS.CUSTOMER.MENU_CHOICES.ADD_MENU.replace(
      "{id}",
      payload.booking_id.toString()
    ).replace("{date}", payload.date);
    return api.post<MenuSelectionResponse>(endpoint, payload, {
      returnFullResponse: true,
    });
  },

  /**
   * Save a single menu choice immediately
   */
  saveMenuChoice: async (
    payload: SaveMenuChoicePayload
  ): Promise<MenuSelectionResponse> => {
    return api.post<MenuSelectionResponse>(
      API_ENDPOINTS.CUSTOMER.MENU_CHOICES.SAVE_MENU_CHOICES,
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
   * @param keyword - For TABLES: table size, For DRINKS/TICKETS: item ID
   * @param type - "tables", "drinks", or "tickets"
   */
  deleteAddOns: async (
    bookingId: number,
    date: string,
    keyword: string | number,
    type: "tables" | "drinks" | "tickets"
  ): Promise<{ status: boolean; message: string }> => {
    const endpoint = API_ENDPOINTS.CUSTOMER.BOOKINGS.DELETE_ADD_ONS.replace(
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
   * Get reschedule data (current date, payment gateways, and available dates)
   * @param bookingId - The booking ID
   * @param bookingDateId - The booking date ID (from dates array)
   */
  getRescheduleData: async (
    bookingId: number,
    bookingDateId: number
  ): Promise<RescheduleDataResponse> => {
    const endpoint = API_ENDPOINTS.CUSTOMER.BOOKINGS.RESCHEDULE_BOOKING.replace(
      "{booking_id}",
      bookingId.toString()
    ).replace("{date_id}", bookingDateId.toString());
    return api.get<RescheduleDataResponse>(endpoint, {
      returnFullResponse: true,
    });
  },

  /**
   * Reschedule a booking date
   * @param payload - The reschedule booking payload with all required data
   */
  rescheduleBooking: async (
    payload: RescheduleBookingPayload
  ): Promise<RescheduleBookingResponse> => {
    const endpoint = API_ENDPOINTS.CUSTOMER.BOOKINGS.SAVE_RESCHEDULE_BOOKING;
    return api.post<RescheduleBookingResponse>(
      endpoint,
      payload,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Process payment for booking
   * @param payload - The booking payment payload with dates and add-ons
   */
  processBookingPayment: async (
    payload: BookingPaymentPayload
  ): Promise<BookingPaymentResponse> => {
    // Convert payload to FormData format as expected by API
    const formData = new FormData();
    formData.append("booking_id", payload.booking_id.toString());
    formData.append("payment_gateway", payload.payment_gateway.toString());

    // Add dates array
    payload.dates.forEach((date, dateIndex) => {
      formData.append(`dates[${dateIndex}][booking_date_id]`, date.booking_date_id.toString());

      // Add add-ons if they exist
      if (date.add_ons) {
        // Add tables
        if (date.add_ons.tables && date.add_ons.tables.length > 0) {
          date.add_ons.tables.forEach((table, tableIndex) => {
            formData.append(
              `dates[${dateIndex}][add_ons][tables][${tableIndex}][booking_date_table_id]`,
              table.booking_date_table_id.toString()
            );
            if (table.event_date_table_id) {
              formData.append(
                `dates[${dateIndex}][add_ons][tables][${tableIndex}][event_date_table_id]`,
                table.event_date_table_id.toString()
              );
            }
          });
        }

        // Add tickets
        if (date.add_ons.tickets && date.add_ons.tickets.length > 0) {
          date.add_ons.tickets.forEach((ticket, ticketIndex) => {
            formData.append(
              `dates[${dateIndex}][add_ons][tickets][${ticketIndex}][booking_date_ticket_id]`,
              ticket.booking_date_ticket_id.toString()
            );
          });
        }
      }
    });

    const endpoint = API_ENDPOINTS.CUSTOMER.BOOKINGS.BOOKING_PAYMENT;
    return api.post<BookingPaymentResponse>(endpoint, formData, {
      returnFullResponse: true,
      headers:
        formData instanceof FormData
          ? {
            "Content-Type": "multipart/form-data",
          }
          : undefined,
    });
  },

  /**
   * Download booking invoice as PDF
   * @param bookingId - The booking ID
   * @returns Promise that triggers file download
   */
  downloadBookingInvoice: async (bookingId: number): Promise<void> => {
    const endpoint = API_ENDPOINTS.CUSTOMER.BOOKINGS.BOOKING_INVOICE.replace(
      "{id}",
      bookingId.toString()
    );

    const domain = useDomainStore.getState().domain;

    const headers: Record<string, string> = backendProxyHeaders();
    if (domain) {
      headers["X-Domain"] = domain;
    }

    const response = await axios.get<Blob>(
      backendProxyUrl(endpoint),
      {
        responseType: "blob",
        headers,
      }
    );

    const contentDisposition = response.headers?.["content-disposition"];
    let filename = `invoice-booking-${bookingId}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch?.[1]) {
        filename = filenameMatch[1].trim();
      }
    }

    const blob = new Blob([response.data], {
      type: (response.headers?.["content-type"] as string | undefined) || "application/pdf",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
