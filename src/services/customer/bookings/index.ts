/**
 * Bookings Module
 *
 * Exports all bookings-related services and types.
 */

export { bookingsService } from "./bookings.service";
export { useBookings, useBooking, bookingsKeys } from "./query";
export type {
  BookingsQueryParams,
  BookingsResponse,
  BookingsResponseData,
  BookingItem,
  BookingDate,
} from "./type";
