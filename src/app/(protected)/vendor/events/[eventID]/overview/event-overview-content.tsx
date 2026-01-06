"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ticket,
  GlassWater,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  useEventOverview,
  type EventOverviewResponse,
} from "./_hooks/useEventOverview";
import { EmptyPlaceholder } from "@/components/empty-placeholder";
import EventOverviewSkeleton from "./_components/overview-skeleton";

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
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch event overview data for the selected tab
  const {
    data: apiResponse,
    isLoading,
    isFetching,
    isError,
  } = useEventOverview({
    eventId,
    dateStatus: selectedTab,
    page: currentPage,
    dateFilter: dateFilter || undefined,
  });

  // Fetch "all" data separately to get accurate counts for all tabs
  // This runs in parallel and is used only for tab counts (not for display)
  // We fetch with a high perPage to ensure we get all records for accurate counting
  const { data: allDataResponse } = useEventOverview({
    eventId,
    dateStatus: "all",
    page: 1,
    perPage: 1000, // High limit to get all records for accurate tab counts
  });

  // Show skeleton only on initial load (when no data exists yet)
  // On tab/page changes, keep content visible with a subtle loading indicator
  const showSkeleton = isLoading && !apiResponse;

  // Loading state - only show skeleton on initial load
  if (showSkeleton) {
    return <EventOverviewSkeleton />;
  }

  // Error state
  if (isError || !apiResponse?.success) {
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

  // Extract data from API response
  const eventData = apiResponse?.event;
  const tableData = apiResponse?.data || [];
  const paginationMeta = apiResponse?.meta;

  // If no data available after loading, show skeleton
  if (!eventData || !paginationMeta) {
    return <EventOverviewSkeleton />;
  }

  // Type aliases for easier usage
  type TableEntry = EventOverviewResponse["data"][0];
  type TableConfig = TableEntry["tables"][0];
  type TicketInfo = NonNullable<TableEntry["tickets"]>[0];
  type DrinkInfo = NonNullable<TableEntry["drinks"]>[0];

  // Handler for page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // When API is connected, the query key dependency will automatically refetch
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handler for tab changes
  const handleTabChange = (value: string) => {
    setSelectedTab(value as "all" | "available" | "sold_out");
    setCurrentPage(1); // Reset to first page on tab change
  };

  // Handler for date filter changes
  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    setCurrentPage(1); // Reset to first page on date filter change
  };

  // Server handles both status filtering and date filtering, so we just sort the data
  // Sort tables by date (newest first)
  const sortedTables = [...tableData].sort(
    (
      a: EventOverviewResponse["data"][0],
      b: EventOverviewResponse["data"][0]
    ) => {
      const dateA = new Date(a.eventDate.split("-").reverse().join("-"));
      const dateB = new Date(b.eventDate.split("-").reverse().join("-"));
      return dateA.getTime() - dateB.getTime();
    }
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
          (t: EventOverviewResponse["data"][0]) => t.soldOut
        ).length
      : tableData.filter((t: EventOverviewResponse["data"][0]) => t.soldOut)
          .length;

  const availableCount =
    allDataForCounts.length > 0
      ? allDataForCounts.filter(
          (t: EventOverviewResponse["data"][0]) => !t.soldOut
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
      {/* Subtle loading overlay for tab/page changes (not initial load) */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background px-4 py-2 rounded-md shadow-sm border">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating...</span>
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
            <h1 className="text-2xl font-bold text-white">{eventData.name}</h1>
            <p className="text-sm text-white">
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
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventData.totalRevenue}</div>
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
            <div className="w-full md:w-[180px]">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => handleDateFilterChange(e.target.value)}
                className="w-full"
                disabled={isFetching}
              />
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
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {sortedTables.map((table) => (
                    <Card
                      key={table.id}
                      className={`overflow-hidden transition-all hover:shadow-md ${
                        table.soldOut ? "border-red-200 bg-red-50/30" : ""
                      }`}
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
                            {table.soldOut ? (
                              <Badge variant="destructive" className="text-xs">
                                Sold Out
                              </Badge>
                            ) : table.tablesLeft < 5 ? (
                              <Badge
                                variant="outline"
                                className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                              >
                                Low Availability
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-50 text-green-700 border-green-200"
                              >
                                Available
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
                                    (t: TableConfig) => t.count > 0
                                  ).length > 0 ? (
                                    table.tables
                                      .filter((t: TableConfig) => t.count > 0)
                                      .map(
                                        (
                                          tableConfig: TableConfig,
                                          idx: number
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
                                        )
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
                                            idx: number
                                          ) => {
                                            const left =
                                              tableConfig.total -
                                              tableConfig.sold;
                                            const percentBooked = Math.round(
                                              (tableConfig.sold /
                                                tableConfig.total) *
                                                100
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
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                  <span>
                                                    {tableConfig.sold}/
                                                    {tableConfig.total} booked
                                                  </span>
                                                  <span className="font-medium">
                                                    {percentBooked}%
                                                  </span>
                                                </div>

                                                {/* Mini progress bar */}
                                                <div className="w-full bg-white/50 rounded-full h-1.5 overflow-hidden">
                                                  <div
                                                    className={`h-full transition-all ${
                                                      isFullyBooked
                                                        ? "bg-red-500"
                                                        : isLowAvailability
                                                        ? "bg-amber-500"
                                                        : "bg-green-500"
                                                    }`}
                                                    style={{
                                                      width: `${percentBooked}%`,
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          }
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
                                        Drinks
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

                        {/* Progress Bar - Only show if there are tables */}
                        {table.totalTables > 0 && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Booking Progress</span>
                              <span>
                                {Math.round(
                                  (table.tablesBooked /
                                    (table.tablesBooked + table.tablesLeft)) *
                                    100
                                )}
                                %
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  table.soldOut
                                    ? "bg-red-500"
                                    : table.tablesLeft < 5
                                    ? "bg-amber-500"
                                    : "bg-green-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    (table.tablesBooked /
                                      (table.tablesBooked + table.tablesLeft)) *
                                      100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Pagination */}
            {paginationMeta && paginationMeta.last_page > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    {/* Previous Button */}
                    {paginationMeta.current_page > 1 && (
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            handlePageChange(paginationMeta.current_page - 1)
                          }
                          aria-label="Go to previous page"
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}

                    {/* First Page */}
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(1)}
                        isActive={paginationMeta.current_page === 1}
                        className="cursor-pointer"
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>

                    {/* Left Ellipsis */}
                    {paginationMeta.current_page > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Current Page and Neighbors */}
                    {Array.from(
                      { length: paginationMeta.last_page },
                      (_, i) => i + 1
                    )
                      .filter(
                        (page) =>
                          page > 1 &&
                          page < paginationMeta.last_page &&
                          Math.abs(page - paginationMeta.current_page) <= 1
                      )
                      .map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={page === paginationMeta.current_page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                    {/* Right Ellipsis */}
                    {paginationMeta.current_page <
                      paginationMeta.last_page - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Last Page */}
                    {paginationMeta.last_page > 1 && (
                      <PaginationItem>
                        <PaginationLink
                          onClick={() =>
                            handlePageChange(paginationMeta.last_page)
                          }
                          isActive={
                            paginationMeta.current_page ===
                            paginationMeta.last_page
                          }
                          className="cursor-pointer"
                        >
                          {paginationMeta.last_page}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {/* Next Button */}
                    {paginationMeta.current_page < paginationMeta.last_page && (
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            handlePageChange(paginationMeta.current_page + 1)
                          }
                          aria-label="Go to next page"
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>

                {/* Pagination Info */}
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  Showing {paginationMeta.from} to {paginationMeta.to} of{" "}
                  {paginationMeta.total} booking dates
                </div>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
