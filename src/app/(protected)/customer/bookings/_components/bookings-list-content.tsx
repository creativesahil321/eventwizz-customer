"use client";

import React, { useMemo } from "react";
import { parseAsString, parseAsInteger, useQueryState } from "nuqs";
import { useInfiniteBookings } from "@/services/customer/bookings";
import BookingsList from "./bookings-list";
import BookingsSkeleton from "./bookings-skeleton";
import { SearchParams } from "@/types";
import { getStringValue } from "../_lib/utils";

type BookingsListContentProps = {
  search: SearchParams;
};

export default function BookingsListContent({
  search,
}: BookingsListContentProps) {
  const [perPage] = useQueryState(
    "per_page",
    parseAsInteger.withDefault(
      search?.per_page ? Number(getStringValue(search.per_page)) : 10,
    ),
  );

  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault(getStringValue(search?.status) || "all"),
  );

  const [searchQuery, setSearchQuery] = useQueryState(
    "search",
    parseAsString.withDefault(getStringValue(search?.search) || ""),
  );

  const mapStatusToAPI = (displayStatus: string): string | undefined => {
    if (displayStatus === "all") return undefined;

    const statusMap: Record<string, string> = {
      confirmed: "confirmed",
      cancelled: "cancelled",
      partial_payment: "partial_payment",
    };

    return statusMap[displayStatus] || displayStatus;
  };

  const queryParams = useMemo(
    () => ({
      per_page: perPage,
      status: mapStatusToAPI(status),
      search: searchQuery || undefined,
    }),
    [perPage, status, searchQuery],
  );

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteBookings(queryParams);

  const bookings =
    data?.pages.flatMap((page) =>
      (page.data ?? []).map((booking) => ({
        ...booking,
        id: booking.booking_id,
        total_amount: booking.total,
      })),
    ) ?? [];

  const showSkeleton = isLoading && !data;
  const isFilterFetching = isFetching && !isFetchingNextPage;

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

  if (showSkeleton) {
    return <BookingsSkeleton count={perPage} />;
  }

  return (
    <BookingsList
      bookings={bookings}
      searchQuery={searchQuery || ""}
      setSearchQuery={setSearchQuery}
      statusFilter={status || "all"}
      setStatusFilter={setStatus}
      isFetching={isFilterFetching}
      hasNextPage={Boolean(hasNextPage)}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={fetchNextPage}
    />
  );
}
