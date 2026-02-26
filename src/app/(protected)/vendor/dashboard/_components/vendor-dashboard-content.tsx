"use client";

import React, { useMemo, useState } from "react";
import {
  useVendorDashboardBookings,
  useVendorDashboardCommissions,
} from "@/services/vendor/dashboard";
import type {
  VendorDashboardPeriod,
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
import { EMPTY_COMMISSIONS_STATS } from "../_lib/constants";
import DashboardSummary from "./dashboard-summary";
import DashboardBookingsCommissions, {
  type BookingsCommissionsTab,
} from "./dashboard-bookings-commissions";
import DashboardBookingsTable from "./_bookings-table";
import BestSales from "./_best-sales";
import VendorDashboardSkeleton from "./dashboard-skeleton";
import type { Orders } from "../_lib/types";

const emptyOrdersByPeriod: Orders = {
  today: [],
  weekly: [],
  monthly: [],
  yearly: [],
};

export default function VendorDashboardContent() {
  const [bookingsPeriod, setBookingsPeriod] =
    useState<VendorDashboardPeriod>("today");
  const [commissionsPeriod, setCommissionsPeriod] =
    useState<VendorDashboardPeriod>("today");
  const [sectionTab, setSectionTab] =
    useState<BookingsCommissionsTab>("bookings");
  const [lastEventSortBy, setLastEventSortBy] =
    useState<VendorDashboardLastEventSortBy>("amount");
  const [lastEventSortOrder, setLastEventSortOrder] =
    useState<VendorDashboardLastEventSortOrder>("desc");

  const bookingsQuery = useVendorDashboardBookings(bookingsPeriod, {
    last_event_sort_by: lastEventSortBy,
    last_event_sort_order: lastEventSortOrder,
  });
  const commissionsQuery = useVendorDashboardCommissions(commissionsPeriod, {
    enabled: sectionTab === "commissions",
  });

  const { data: bookingsData, isLoading: bookingsLoading, isError: bookingsError, error: bookingsErrorObj } = bookingsQuery;
  const { data: commissionsData } = commissionsQuery;

  const summaryItems = useMemo(() => {
    if (!bookingsData?.data?.summary) return [];
    return mapSummaryToItems(bookingsData.data.summary);
  }, [bookingsData?.data?.summary]);

  const bookingsStats = useMemo((): Orders => {
    if (!bookingsData?.data?.bookings_stats) return emptyOrdersByPeriod;
    const cards = mapBookingsStatsToOrders(bookingsData.data.bookings_stats);
    return { ...emptyOrdersByPeriod, [bookingsPeriod]: cards };
  }, [bookingsData?.data?.bookings_stats, bookingsPeriod]);

  const commissionsStats = useMemo((): Orders => {
    const raw = commissionsData?.data?.commissions_stats;
    const cards = mapCommissionsStatsToOrders(raw);
    return { ...EMPTY_COMMISSIONS_STATS, [commissionsPeriod]: cards };
  }, [commissionsData?.data?.commissions_stats, commissionsPeriod]);

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
          bookingsStats={bookingsStats}
          commissionsStats={commissionsStats}
          bookingsPeriod={bookingsPeriod}
          onBookingsPeriodChange={(p) =>
            setBookingsPeriod(p as VendorDashboardPeriod)
          }
          commissionsPeriod={commissionsPeriod}
          onCommissionsPeriodChange={(p) =>
            setCommissionsPeriod(p as VendorDashboardPeriod)
          }
          activeTab={sectionTab}
          onTabChange={setSectionTab}
        />
      </section>

      <section className="w-full relative">
        <DashboardBookingsTable
          initialData={recentBookings}
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
