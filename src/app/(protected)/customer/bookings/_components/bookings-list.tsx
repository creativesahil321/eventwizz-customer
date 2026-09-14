"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import BookingCard from "./booking-card";
import { BookingCardSkeleton } from "./bookings-skeleton";
import { Booking } from "../_lib/types";
import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatBookingStatus,
  getBookingDateRowKey,
  getCustomerBookingDetailPath,
} from "../_lib/utils";
import {
  Search,
  Filter,
  ChevronRight,
  UtensilsCrossed,
  Ticket,
  Wine,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BookingsListProps {
  bookings: Booking[];
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  statusFilter?: string;
  setStatusFilter?: (status: string) => void;
  isFetching?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export default function BookingsList({
  bookings,
  searchQuery: externalSearchQuery,
  setSearchQuery: setExternalSearchQuery,
  statusFilter: externalStatusFilter,
  setStatusFilter: setExternalStatusFilter,
  isFetching = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: BookingsListProps) {
  const router = useRouter();
  const [internalSearchQuery, setInternalSearchQuery] = React.useState("");
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore?.();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  // Use external state if provided, otherwise use internal state
  const searchQuery = externalSearchQuery ?? internalSearchQuery;
  const statusFilter = externalStatusFilter ?? "all";
  const setStatusFilter = setExternalStatusFilter ?? (() => {});

  // Local state for search input (not synced with URL until search button clicked)
  const [localSearchValue, setLocalSearchValue] = useState(searchQuery || "");

  // Sync local search value when external searchQuery changes (e.g., from URL)
  useEffect(() => {
    setLocalSearchValue(searchQuery || "");
  }, [searchQuery]);

  // Handle search button click - triggers API call
  const handleSearch = () => {
    if (setExternalSearchQuery) {
      setExternalSearchQuery(localSearchValue.trim());
    } else {
      setInternalSearchQuery(localSearchValue.trim());
    }
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Handle search input change - only updates local state
  const handleSearchChange = (value: string) => {
    setLocalSearchValue(value);
  };

  // Clear search
  const handleClearSearch = () => {
    setLocalSearchValue("");
    if (setExternalSearchQuery) {
      setExternalSearchQuery("");
    } else {
      setInternalSearchQuery("");
    }
  };

  // Reset all filters (search + status)
  const handleResetFilters = () => {
    handleClearSearch();
    setStatusFilter("all");
  };

  const handleViewDetails = (booking: Booking) => {
    if (!booking.booking_number) return;
    router.push(getCustomerBookingDetailPath(booking.booking_number));
  };

  const handleAddMenu = (booking: Booking) => {
    if (!booking.booking_number) return;
    router.push(getCustomerBookingDetailPath(booking.booking_number));
  };

  // API handles all filtering (search, payment_status), so we use bookings directly
  // No client-side filtering needed as API handles it

  return (
    <>
      <section className="w-full space-y-6">
        <ProtectedPageHeader
          title="My Bookings"
          description="View and manage your event bookings"
          actions={
            <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:w-auto">
              {/* Search Input with Button */}
              <div className="relative flex-1 min-w-0 sm:min-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  placeholder="Search by event, ID..."
                  value={localSearchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-9 pr-20 h-10 text-sm sm:text-base"
                />
                <Button
                  onClick={handleSearch}
                  variant="event-primary"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                  }}
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Booking Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px] lg:w-[180px] h-10 text-sm sm:text-base">
                  <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="Booking Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bookings</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="partial_payment">
                    Partial Payment
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Button */}
              {(localSearchValue || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-10 px-3 sm:px-4 gap-1.5 shrink-0"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              )}
            </div>
          }
        />

        {/* Bookings Grid */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 ${
            isFetching ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {bookings.length > 0 ? (
            <>
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.booking_id}
                  booking={booking}
                  onViewDetails={handleViewDetails}
                  onAddMenu={handleAddMenu}
                />
              ))}
              {isFetchingNextPage
                ? Array.from({ length: 4 }).map((_, index) => (
                    <BookingCardSkeleton key={`load-more-${index}`} />
                  ))
                : null}
            </>
          ) : (
            <div className="col-span-full bg-white rounded-lg border border-[var(--color-border)] p-6 sm:p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 sm:p-4 bg-muted rounded-full">
                  <Search className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold">
                  No bookings found
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                  {localSearchValue || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "You don’t have any bookings yet. Browse events to make your first booking."}
                </p>
                {(localSearchValue ||
                  searchQuery ||
                  statusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      handleClearSearch();
                      setStatusFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={loadMoreRef} className="h-4" aria-hidden />
      </section>

      {/* Date Selection Modal */}
      <Dialog open={showDateModal} onOpenChange={setShowDateModal}>
        <DialogContent className="w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl text-black font-bold">
              Select a Date
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-black">
              Choose which date you want to add menu choices for.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 sm:py-4 max-h-[60vh] overflow-y-auto">
            {selectedBooking?.booking_dates?.map((bookingDate, index) => (
              <Button
                key={getBookingDateRowKey(bookingDate, index)}
                onClick={() => setShowDateModal(false)}
                variant="outline"
                className="w-full justify-start text-left h-auto py-2 sm:py-3 cursor-pointer hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 sm:gap-3 w-full">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-xs sm:text-sm truncate text-black">
                        {bookingDate.date}
                      </p>
                      {(() => {
                        const { label, isConfirmed, className } =
                          formatBookingStatus(bookingDate.status);

                        return (
                          <Badge
                            variant={isConfirmed ? "default" : "secondary"}
                            className={`flex items-center gap-1 px-1.5 py-0 text-xs font-medium ${className}`}
                          >
                            {isConfirmed ? (
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            ) : (
                              <Clock className="h-2.5 w-2.5" />
                            )}
                            <span className="text-[10px]">{label}</span>
                          </Badge>
                        );
                      })()}
                    </div>
                    {bookingDate.room_name?.trim() ? (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">
                        {bookingDate.room_name.trim()}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                      {(bookingDate.tables ?? 0) > 0 && (
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <UtensilsCrossed className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span>
                            {bookingDate.tables} Table
                            {(bookingDate.tables ?? 0) > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {bookingDate.table?.table_size ? (
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <UtensilsCrossed className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span>
                            Table for {bookingDate.table.table_size}
                          </span>
                        </div>
                      ) : null}
                      {(bookingDate.tickets ?? 0) > 0 && (
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <Ticket className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span>
                            {bookingDate.tickets} Ticket
                            {(bookingDate.tickets ?? 0) > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {(bookingDate.drinks ?? 0) > 0 && (
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <Wine className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span>Drinks Included</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
