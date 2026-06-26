"use client";

import React, { useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  useVendorDashboardBookings,
  useVendorDashboardCommissions,
} from "@/services/vendor/dashboard";
import type {
  DashboardDateRangeParams,
  VendorDashboardLastEventSortBy,
  VendorDashboardLastEventSortOrder,
} from "@/services/vendor/dashboard";
import {
  mapSummaryToItems,
  mapBookingsStatsToOrders,
  mapCommissionsStatsToOrders,
  mapRecentBookingsToTableRows,
  mapLastEventOverviewToBestSales,
} from "../_lib/dashboard-mappers";
import DashboardSummary from "./dashboard-summary";
import DashboardBookingsCommissions, {
  type BookingsCommissionsTab,
} from "./dashboard-bookings-commissions";
import DashboardBookingsTable from "./_bookings-table";
import BestSales from "./_best-sales";
import VendorDashboardSkeleton from "./dashboard-skeleton";
import type { OrderCardItem } from "../_lib/dashboard-mappers";

function defaultDateRange(): DashboardDateRangeParams {
  const today = format(new Date(), "yyyy-MM-dd");
  return {
    from_date: today,
    to_date: today,
  };
}

export default function VendorDashboardContent() {
  const [bookingsDateRange, setBookingsDateRange] =
    useState<DashboardDateRangeParams>(defaultDateRange);
  const [commissionsDateRange, setCommissionsDateRange] =
    useState<DashboardDateRangeParams>(defaultDateRange);
  const [sectionTab, setSectionTab] =
    useState<BookingsCommissionsTab>("bookings");
  const [lastEventSortBy, setLastEventSortBy] =
    useState<VendorDashboardLastEventSortBy>("amount");
  const [lastEventSortOrder, setLastEventSortOrder] =
    useState<VendorDashboardLastEventSortOrder>("desc");

  const bookingsQuery = useVendorDashboardBookings(bookingsDateRange);
  const commissionsQuery = useVendorDashboardCommissions(commissionsDateRange, {
    enabled: sectionTab === "commissions",
  });

  const { data: bookingsData, isLoading: bookingsLoading, isError: bookingsError, error: bookingsErrorObj } = bookingsQuery;
  const { data: commissionsData } = commissionsQuery;

  const summaryItems = useMemo(() => {
    if (!bookingsData?.data?.summary) return [];
    return mapSummaryToItems(bookingsData.data.summary);
  }, [bookingsData?.data?.summary]);

  const bookingsCards = useMemo((): OrderCardItem[] => {
    if (!bookingsData?.data?.bookings_stats) return [];
    return mapBookingsStatsToOrders(bookingsData.data.bookings_stats);
  }, [bookingsData?.data?.bookings_stats]);

  const commissionsCards = useMemo((): OrderCardItem[] => {
    const raw = commissionsData?.data?.commissions_stats;
    return mapCommissionsStatsToOrders(raw);
  }, [commissionsData?.data?.commissions_stats]);

  const recentBookings = useMemo(() => {
    if (!bookingsData?.data?.recent_bookings) return [];
    return mapRecentBookingsToTableRows(bookingsData.data.recent_bookings);
  }, [bookingsData?.data?.recent_bookings]);

  const lastEventSales = useMemo(() => {
    if (!bookingsData?.data?.last_event_performing_overview) return [];
    return mapLastEventOverviewToBestSales(
      bookingsData.data.last_event_performing_overview,
    );
  }, [bookingsData?.data?.last_event_performing_overview]);

  const handleBookingsDateRangeChange = useCallback(
    (from_date: string | undefined, to_date: string | undefined) => {
      if (from_date && to_date) {
        setBookingsDateRange({ from_date, to_date });
      } else {
        setBookingsDateRange(defaultDateRange());
      }
    },
    []
  );

  const handleCommissionsDateRangeChange = useCallback(
    (from_date: string | undefined, to_date: string | undefined) => {
      if (from_date && to_date) {
        setCommissionsDateRange({ from_date, to_date });
      } else {
        setCommissionsDateRange(defaultDateRange());
      }
    },
    []
  );

  if (bookingsLoading && !bookingsData) {
    return <VendorDashboardSkeleton />;
  }

  if (bookingsError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">
          {bookingsErrorObj instanceof Error ? bookingsErrorObj.message : "Failed to load dashboard"}
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="w-full relative">
        <DashboardSummary title="Summary" items={summaryItems} />
      </section>

      <section className="w-full relative">
        <DashboardBookingsCommissions
          bookingsCards={bookingsCards}
          commissionsCards={commissionsCards}
          bookingsDateRange={bookingsDateRange}
          onBookingsDateRangeChange={handleBookingsDateRangeChange}
          commissionsDateRange={commissionsDateRange}
          onCommissionsDateRangeChange={handleCommissionsDateRangeChange}
          activeTab={sectionTab}
          onTabChange={setSectionTab}
        />
      </section>

      <section className="w-full relative">
        <DashboardBookingsTable
          initialData={recentBookings}
          isLoading={bookingsLoading}
          search={{ page: 1, per_page: 10, search: "" }}
        />
      </section>

      <section className="w-full relative">
        <BestSales
          sales={lastEventSales}
          sortBy={lastEventSortBy}
          sortOrder={lastEventSortOrder}
          onSortChange={(by, order) => {
            setLastEventSortBy(by);
            setLastEventSortOrder(order);
          }}
        />
      </section>
    </>
  );
}
