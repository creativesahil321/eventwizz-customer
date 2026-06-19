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
 * @returns React Query result with add-ons data
 *
 * @example
 * const { data, isLoading, error } = useAddOnsDetails("123", "2025-09-20");
 */
export const useAddOnsDetails = (bookingId: string, date: string) => {
  // Parse and validate bookingId
  const parsedId = parseInt(bookingId, 10);
  const isValidId = !isNaN(parsedId) && parsedId > 0;

  // Validate date format (basic validation)
  const isValidDate = !!date && /^\d{4}-\d{2}-\d{2}$/.test(date);

  return useQuery<AddOnsResponse>({
    queryKey: ["add-ons-details", bookingId, date],
    queryFn: async () => {
      if (!isValidId) {
        throw new Error("Invalid booking ID");
      }
      if (!isValidDate) {
        throw new Error("Invalid date format");
      }
      return bookingsService.getAddOnsDetails(parsedId, date);
    },
    enabled: isValidId && isValidDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2, // Retry failed requests twice
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};
