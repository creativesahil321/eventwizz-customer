"use client";

import React, { useMemo, useEffect } from "react";
import { parseAsString, parseAsInteger, useQueryState } from "nuqs";
import { useBookings } from "@/services/customer/bookings";
import BookingsList from "./bookings-list";
import BookingsPagination from "./bookings-pagination";
import BookingsSkeleton from "./bookings-skeleton";
import { SearchParams } from "@/types";
import { getStringValue } from "../_lib/utils";

type BookingsListContentProps = {
  search: SearchParams;
};

export default function BookingsListContent({
  search,
}: BookingsListContentProps) {
  // Query state for filters and pagination
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(
      search?.page ? Number(getStringValue(search.page)) : 1
    )
  );

  const [perPage] = useQueryState(
    "per_page",
    parseAsInteger.withDefault(
      search?.per_page ? Number(getStringValue(search.per_page)) : 10
    )
  );

  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault(getStringValue(search?.status) || "all")
  );

  const [searchQuery, setSearchQuery] = useQueryState(
    "search",
    parseAsString.withDefault(getStringValue(search?.search) || "")
  );

  // Map display status values to API status values
  const mapStatusToAPI = (displayStatus: string): string | undefined => {
    if (displayStatus === "all") return undefined;
    
    const statusMap: Record<string, string> = {
      pending: "pending",
      confirmed: "confirmed",
      cancelled: "cancelled",
      partial_payment: "partial_payment",
    };
    
    return statusMap[displayStatus] || displayStatus;
  };

  // Format API query params
  const queryParams = useMemo(
    () => ({
      page,
      per_page: perPage,
      status: mapStatusToAPI(status),
      search: searchQuery || undefined,
    }),
    [page, perPage, status, searchQuery]
  );

  // Reset page to 1 when filters change (but not on initial load)
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, searchQuery]);

  // Fetch bookings with TanStack Query
  const { data, isLoading, isFetching, error } = useBookings(queryParams);

  // Extract items and meta from the response
  const bookings =
    data?.data?.map((booking) => ({
      ...booking,
      id: booking.booking_id, // Add id alias for backward compatibility
      total_amount: booking.total, // Add total_amount alias for backward compatibility
    })) || [];

  const meta = data?.meta || { last_page: 1, total: 0, current_page: 1 };

  // Show skeleton only on initial load (isLoading), not on refetch (isFetching)
  const showSkeleton = isLoading && !data;

  if (error) {
    return (
      <div className="w-full flex items-center justify-center p-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive">
            Error loading bookings
          </h3>
          <p className="text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Something went wrong"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSkeleton ? (
        <BookingsSkeleton count={perPage} />
      ) : (
        <BookingsList
          bookings={bookings}
          searchQuery={searchQuery || ""}
          setSearchQuery={setSearchQuery}
          statusFilter={status || "all"}
          setStatusFilter={setStatus}
          isFetching={isFetching}
        />
      )}
      {!showSkeleton && (
        <section className="w-full my-6">
          <BookingsPagination
            currentPage={meta.current_page || page}
            setPage={setPage}
            totalPages={meta.last_page || 1}
          />
        </section>
      )}
    </>
  );
}
