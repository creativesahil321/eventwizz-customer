/**
 * React Query Hook for Add-Ons Details
 *
 * Fetches add-ons data (tables, tickets, drinks) for a specific booking and date
 * with proper caching and error handling
 */

import { useQuery } from "@tanstack/react-query";
import { bookingsService } from "../bookings.service";
import { AddOnsResponse } from "../type";

/**
 * Hook to fetch add-ons details for a booking
 *
 * @param bookingId - The booking ID (must be a valid numeric string)
 * @param date - The event date in YYYY-MM-DD format
 * @param roomId - Room scope for multi-room events only (omit for flat events)
 * @returns React Query result with add-ons data
 *
 * @example
 * const { data, isLoading, error } = useAddOnsDetails("123", "2025-09-20", 114);
 */
export const useAddOnsDetails = (
  bookingId: string,
  date: string,
  roomId?: number | null,
) => {
  const parsedId = parseInt(bookingId, 10);
  const isValidId = !isNaN(parsedId) && parsedId > 0;
  const isValidDate = !!date && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const resolvedRoomId =
    roomId != null && Number(roomId) > 0 ? Number(roomId) : undefined;

  return useQuery<AddOnsResponse>({
    queryKey: ["add-ons-details", bookingId, resolvedRoomId ?? "flat", date],
    queryFn: async () => {
      if (!isValidId) {
        throw new Error("Invalid booking ID");
      }
      if (!isValidDate) {
        throw new Error("Invalid date format");
      }
      return bookingsService.getAddOnsDetails(parsedId, date, resolvedRoomId);
    },
    enabled: isValidId && isValidDate,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
};
