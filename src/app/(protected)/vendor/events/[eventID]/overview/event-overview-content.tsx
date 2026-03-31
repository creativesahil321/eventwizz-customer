"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Calendar,
  Users,
  PoundSterling,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ticket,
  GlassWater,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useEventOverviewInfinite,
  type EventOverviewResponse,
} from "./_hooks/useEventOverviewInfinite";
import { useEventOverview } from "./_hooks/useEventOverview";
import { EmptyPlaceholder } from "@/components/empty-placeholder";
import EventOverviewSkeleton from "./_components/overview-skeleton";
import { BookingItemSkeleton } from "./_components/booking-item-skeleton";

interface EventOverviewClientProps {
  eventId: string;
}

export default function EventOverviewClient({
  eventId,
}: EventOverviewClientProps) {
  const [dateFilter, setDateFilter] = useState("");
  const [selectedTab, setSelectedTab] = useState<
    "all" | "available" | "sold_out"
  >("all");

  // Intersection observer ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Single source for "all" tab: one request for both list and tab counts
  const {
    data: allDataResponse,
    isLoading: allDataLoading,
    isFetching: allDataFetching,
    isError: allDataError,
  } = useEventOverview({
    eventId,
    dateStatus: "all",
    page: 1,
    perPage: 1000,
    dateFilter: dateFilter || undefined,
  });

  // Infinite scroll only for "available" and "sold_out" tabs (avoids duplicate overview request when on "all")
  const {
    data: infiniteData,
    isLoading: infiniteLoading,
    isFetching,
    isError: infiniteError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEventOverviewInfinite({
    eventId,
    dateStatus: selectedTab,
    perPage: 10,
    dateFilter: dateFilter || undefined,
    enabled: selectedTab !== "all",
  });

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // When the load more element is visible and there's more data to load
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: "100px", // Start loading 100px before reaching the element
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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isAllTab = selectedTab === "all";
  // Only show "Refreshing" overlay after a short delay to avoid flashing on date/tab change
  const isRefetching = isAllTab ? allDataFetching : isFetching;
  const [showRefreshOverlay, setShowRefreshOverlay] = useState(false);
  useEffect(() => {
    if (!isRefetching) {
      setShowRefreshOverlay(false);
      return;
    }
    const timer = window.setTimeout(() => setShowRefreshOverlay(true), 400);
    return () => window.clearTimeout(timer);
  }, [isRefetching]);
  const showSkeleton =
    (isAllTab && allDataLoading && !allDataResponse) ||
    (!isAllTab && infiniteLoading && !infiniteData);

  if (showSkeleton) {
    return <EventOverviewSkeleton />;
  }

  const allSuccess = allDataResponse?.success !== false;
  const infiniteSuccess = infiniteData?.pages[0]?.success !== false;
  const hasError =
    (isAllTab && (allDataError || !allSuccess)) ||
    (!isAllTab && (infiniteError || !infiniteSuccess));

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <EmptyPlaceholder
          icon={<AlertCircle className="h-10 w-10 text-muted-foreground" />}
          title="Error Loading Overview"
          description="Failed to load event overview data. Please try again."
        />
      </div>
    );
  }

  const firstPage = infiniteData?.pages[0];
  const eventData = isAllTab ? allDataResponse?.event : firstPage?.event;
  const paginationMeta = isAllTab ? allDataResponse?.meta : firstPage?.meta;
  const tableData = isAllTab
    ? allDataResponse?.data || []
    : infiniteData?.pages.flatMap((page) => page.data || []) || [];

  if (!eventData || !paginationMeta) {
    return <EventOverviewSkeleton />;
  }

  // Type aliases for easier usage
  type TableEntry = EventOverviewResponse["data"][0];
  type TableConfig = TableEntry["tables"][0];
  type TicketInfo = NonNullable<TableEntry["tickets"]>[0];
  type DrinkInfo = NonNullable<TableEntry["drinks"]>[0];

  const drinksSectionLabel = (row: TableEntry) => {
    const raw = (row.drink_title ?? "").trim();
    return raw || "Drinks";
  };

  // Handler for tab changes
  const handleTabChange = (value: string) => {
    setSelectedTab(value as "all" | "available" | "sold_out");
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handler for date filter changes
  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Server handles both status filtering and date filtering, so we just sort the data
  // Sort tables by date (newest first)
  const sortedTables = [...tableData].sort(
    (
      a: EventOverviewResponse["data"][0],
      b: EventOverviewResponse["data"][0],
    ) => {
      const dateA = new Date(a.eventDate.split("-").reverse().join("-"));
      const dateB = new Date(b.eventDate.split("-").reverse().join("-"));
      return dateA.getTime() - dateB.getTime();
    },
  );

  // Calculate accurate tab counts using "all" data
  // Use allDataResponse to get accurate counts for all tabs, regardless of current filter
  const allDataForCounts = allDataResponse?.data || [];
  const allMetaForCounts = allDataResponse?.meta;

  // Count from "all" data to get accurate counts for all tabs
  // This ensures counts are always accurate regardless of which tab is selected
  // Fallback to current data if "all" data isn't loaded yet
  const totalAllCount =
    allMetaForCounts?.total ||
    (allDataForCounts.length > 0
      ? allDataForCounts.length
      : paginationMeta?.total || tableData.length);

  const soldOutCount =
    allDataForCounts.length > 0
      ? allDataForCounts.filter(
          (t: EventOverviewResponse["data"][0]) => t.soldOut,
        ).length
      : tableData.filter((t: EventOverviewResponse["data"][0]) => t.soldOut)
          .length;

  const availableCount =
    allDataForCounts.length > 0
      ? allDataForCounts.filter(
          (t: EventOverviewResponse["data"][0]) => !t.soldOut,
        ).length
      : tableData.filter((t: EventOverviewResponse["data"][0]) => !t.soldOut)
          .length;

  // Use accurate counts from "all" data for all tabs
  // These will update once "all" data is loaded
  const allTabCount = totalAllCount;
  const availableTabCount = availableCount;
  const soldOutTabCount = soldOutCount;

  return (
    <div className="space-y-6 relative">
      {/* Subtle loading overlay for tab/filter changes, only after short delay to avoid flash */}
      {showRefreshOverlay && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg pointer-events-none opacity-0 animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="flex items-center gap-2.5 text-sm text-foreground bg-background/95 px-5 py-2.5 rounded-lg shadow-lg border border-border">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium">Refreshing data...</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vendor/events">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{eventData.name}</h1>
            <p className="text-sm text-[var(--text-primary)]">
              Event Overview & Booking Details
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            eventData.status === "active"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-50 text-gray-700 border-gray-200"
          }
        >
          {eventData.status.charAt(0).toUpperCase() + eventData.status.slice(1)}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventData.totalRevenue.replace(/\$/g, "£")}
            </div>
            <p className="text-xs text-muted-foreground">
              From {eventData.totalBookings} bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventData.totalBookings}</div>
            <p className="text-xs text-muted-foreground">Across all dates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventData.totalGuests}</div>
            <p className="text-xs text-muted-foreground">Expected attendees</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Booking Details</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                View and manage all table bookings for this event
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-[180px]">
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => handleDateFilterChange(e.target.value)}
                  className="w-full md:w-[180px]"
                  aria-label="Filter by date (dd-mm-yyyy)"
                />
                {!dateFilter && (
                  <span
className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 sm:hidden"
                  aria-hidden
                >
                  dd-mm-yyyy
                  </span>
                )}
              </div>
              {dateFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateFilter("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="shrink-0"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Reset
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Tabs for filtering */}
          <Tabs
            value={selectedTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="all">All ({allTabCount})</TabsTrigger>
              <TabsTrigger value="available">
                Available ({availableTabCount})
              </TabsTrigger>
              <TabsTrigger value="sold_out">
                Sold Out ({soldOutTabCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-3">
              {sortedTables.length === 0 ? (
                <div className="text-center py-12">
                  <EmptyPlaceholder
                    icon={
                      <Calendar className="h-10 w-10 text-muted-foreground" />
                    }
                    title={
                      selectedTab === "sold_out"
                        ? "No Sold Out Dates"
                        : selectedTab === "available"
                          ? "No Available Dates"
                          : "No Dates Found"
                    }
                    description={
                      dateFilter
                        ? "No booking dates found matching the selected date."
                        : selectedTab === "sold_out"
                          ? "There are no sold out booking dates for this event."
                          : selectedTab === "available"
                            ? "There are no available booking dates for this event."
                            : "No booking dates found for this event."
                    }
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedTables.map((table, index) => (
                    <Card
                      key={table.id}
                      className={`overflow-hidden transition-all duration-300 ease-in-out hover:shadow-md ${
                        table.soldOut ? "border-red-200 bg-red-50/30" : ""
                      }`}
                      style={{
                        animation: `fadeInUp 0.4s ease-out ${Math.min(
                          index * 50,
                          300,
                        )}ms both`,
                      }}
                    >
                      <CardContent className="p-4">
                        <div
                          className={`grid grid-cols-1 md:grid-cols-2 ${
                            table.tables && table.tables.length > 0
                              ? "lg:grid-cols-4"
                              : "lg:grid-cols-2"
                          } gap-4`}
                        >
                          {/* Date & Status */}
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">
                              Event Date
                            </p>
                            <p className="font-bold text-base">
                              {table.eventDate}
                            </p>
                            {table.soldOut && (
                              <Badge variant="destructive" className="text-xs">
                                Sold Out
                              </Badge>
                            )}
                          </div>

                          {/* Table Info - Only show if tables exist */}
                          {table.tables &&
                            table.tables.filter((t: TableConfig) => t.count > 0)
                              .length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium">
                                  Tables Configuration
                                </p>
                                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                  {table.tables.filter(
                                    (t: TableConfig) => t.count > 0,
                                  ).length > 0 ? (
                                    table.tables
                                      .filter((t: TableConfig) => t.count > 0)
                                      .map(
                                        (
                                          tableConfig: TableConfig,
                                          idx: number,
                                        ) => (
                                          <p key={idx} className="text-sm">
                                            <span className="font-semibold">
                                              {tableConfig.count}
                                            </span>{" "}
                                            × Table of {tableConfig.size}{" "}
                                            <span className="text-muted-foreground">
                                              ({tableConfig.price})
                                            </span>
                                          </p>
                                        ),
                                      )
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      No tables
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground pt-1 border-t mt-1">
                                    Total: {table.totalTables} tables
                                  </p>
                                </div>
                              </div>
                            )}

                          {/* Booking Stats - Only show if tables exist */}
                          {table.tables &&
                            table.tables.filter((t: TableConfig) => t.count > 0)
                              .length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">
                                  Booking Statistics
                                </p>
                                <div className="space-y-2">
                                  {/* Summary Stats */}
                                  <div className="grid grid-cols-3 gap-2 pb-2 border-b">
                                    <div className="text-center">
                                      <p className="text-lg font-bold text-foreground">
                                        {table.tablesBooked}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Booked
                                      </p>
                                    </div>
                                    <div className="text-center border-x">
                                      <p className="text-lg font-bold text-foreground">
                                        {table.totalPeople}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Guests
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-lg font-bold text-green-600">
                                        {table.tablesLeft}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Left
                                      </p>
                                    </div>
                                  </div>

                                  {/* Per-table-type breakdown */}
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                                      <ChevronDown className="w-3 h-3" />
                                      By Table Type
                                    </p>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                      {table.tables
                                        .filter((t: TableConfig) => t.count > 0)
                                        .map(
                                          (
                                            tableConfig: TableConfig,
                                            idx: number,
                                          ) => {
                                            const left =
                                              tableConfig.total -
                                              tableConfig.sold;
                                            const percentBooked = Math.round(
                                              (tableConfig.sold /
                                                tableConfig.total) *
                                                100,
                                            );
                                            const isFullyBooked = left === 0;
                                            const isLowAvailability =
                                              left > 0 && left <= 2;

                                            return (
                                              <div
                                                key={idx}
                                                className={`border rounded-md p-2 space-y-1.5 transition-all ${
                                                  isFullyBooked
                                                    ? "bg-red-50 border-red-200"
                                                    : isLowAvailability
                                                      ? "bg-amber-50 border-amber-200"
                                                      : "bg-green-50 border-green-200"
                                                }`}
                                              >
                                                {/* Table type header */}
                                                <div className="flex items-center justify-between">
                                                  <span className="text-sm font-semibold text-foreground">
                                                    Table of {tableConfig.size}
                                                  </span>
                                                  {isFullyBooked ? (
                                                    <div className="flex items-center gap-1 text-xs font-medium text-red-600">
                                                      <XCircle className="w-3.5 h-3.5" />
                                                      Fully Booked
                                                    </div>
                                                  ) : isLowAvailability ? (
                                                    <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
                                                      <AlertCircle className="w-3.5 h-3.5" />
                                                      {left} Left
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                                      {left} Available
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Progress info */}
                                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                                  <span>
                                                    {tableConfig.sold}/
                                                    {tableConfig.total} booked
                                                  </span>
                                                  <span className="font-medium tabular-nums">
                                                    {percentBooked}%
                                                  </span>
                                                </div>

                                                {/* Mini progress bar - same track/color as main Booking Progress */}
                                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                  <div
                                                    className={`h-full transition-all ${
                                                      isFullyBooked
                                                        ? "bg-destructive"
                                                        : "bg-[var(--color-primary)]"
                                                    }`}
                                                    style={{
                                                      width: `${Math.min(percentBooked, 100)}%`,
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          },
                                        )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Category & Date */}
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">
                              Additional Info
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Category:</span>{" "}
                              {table.category}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Submitted:</span>{" "}
                              {table.submittedOn}
                            </p>
                          </div>
                        </div>

                        {/* Tickets & Drinks Section */}
                        {(table.tickets && table.tickets.length > 0) ||
                        (table.drinks && table.drinks.length > 0) ? (
                          <div className="mt-3 pt-3 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Tickets */}
                              {table.tickets && table.tickets.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Tickets
                                      </p>
                                    </div>
                                    {table.tickets.length > 3 && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {table.tickets.length} total
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                    {table.tickets.map((ticket: TicketInfo) => {
                                      const left = ticket.total - ticket.sold;
                                      return (
                                        <div
                                          key={ticket.id}
                                          className="flex items-center justify-between text-xs py-1.5 px-2 rounded border bg-muted/30"
                                        >
                                          <span className="font-medium text-foreground truncate flex-1 mr-2">
                                            {ticket.name}
                                          </span>
                                          <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className="text-muted-foreground">
                                              {ticket.sold}/{ticket.total} sold
                                            </span>
                                            {left === 0 ? (
                                              <Badge
                                                variant="destructive"
                                                className="text-[10px] px-1.5 py-0 h-4"
                                              >
                                                Sold Out
                                              </Badge>
                                            ) : (
                                              <span className="text-green-600 font-medium">
                                                {left} left
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Drinks */}
                              {table.drinks && table.drinks.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <GlassWater className="h-3.5 w-3.5 text-muted-foreground" />
                                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        {drinksSectionLabel(table)}
                                      </p>
                                    </div>
                                    {table.drinks.length > 3 && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {table.drinks.length} total
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                    {table.drinks.map((drink: DrinkInfo) => (
                                      <div
                                        key={drink.id}
                                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded border bg-muted/30"
                                      >
                                        <span className="font-medium text-foreground truncate flex-1 mr-2">
                                          {drink.name}
                                        </span>
                                        <span className="text-muted-foreground flex-shrink-0">
                                          {drink.quantity} added
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {/* Progress Bar - Only show if there are tables. Progress = (booked / total) * 100. */}
                        {table.totalTables > 0 && (
                          <div className="mt-4">
                            <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                              <span>Booking Progress</span>
                              <span className="font-medium tabular-nums">
                                {Math.round(
                                  (table.tablesBooked /
                                    (table.tablesBooked + table.tablesLeft)) *
                                    100,
                                )}
                                %
                              </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  table.soldOut
                                    ? "bg-destructive"
                                    : "bg-[var(--color-primary)]"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    (table.tablesBooked /
                                      (table.tablesBooked + table.tablesLeft)) *
                                      100,
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Infinite Scroll Loading Skeleton */}
                  {isFetchingNextPage && (
                    <div className="space-y-3 opacity-0 animate-[fadeIn_0.3s_ease-out_0.1s_forwards]">
                      <BookingItemSkeleton />
                      <BookingItemSkeleton />
                    </div>
                  )}

                  {/* Infinite Scroll Trigger */}
                  <div ref={loadMoreRef} className="py-6">
                    {isFetchingNextPage && (
                      <div className="flex flex-col items-center justify-center gap-3 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="font-medium">
                            Loading more booking dates...
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"></div>
                        </div>
                      </div>
                    )}
                    {!hasNextPage && sortedTables.length > 0 && (
                      <div className="text-center py-6 border-t opacity-0 animate-[fadeIn_0.4s_ease-out_0.2s_forwards]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle2 className="h-5 w-5 text-green-500 animate-[scaleIn_0.3s_ease-out]" />
                            <p className="font-semibold text-base">
                              All booking dates loaded
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Showing all {paginationMeta.total} booking date
                            {paginationMeta.total !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
