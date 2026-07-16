"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useCallback } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import OrderCard from "./dashboard-order-card";
import type { DashboardDateRangeParams } from "@/services/vendor/dashboard";
import type { OrderCardItem } from "../_lib/dashboard-mappers";

export type BookingsCommissionsTab = "bookings" | "commissions";

interface DashboardBookingsCommissionsProps {
  bookingsCards: OrderCardItem[];
  commissionsCards: OrderCardItem[];
  bookingsDateRange: DashboardDateRangeParams;
  onBookingsDateRangeChange: (from_date?: string, to_date?: string) => void;
  commissionsDateRange: DashboardDateRangeParams;
  onCommissionsDateRangeChange: (from_date?: string, to_date?: string) => void;
  activeTab?: BookingsCommissionsTab;
  onTabChange?: (tab: BookingsCommissionsTab) => void;
}

export default function DashboardBookingsCommissions({
  bookingsCards,
  commissionsCards,
  bookingsDateRange,
  onBookingsDateRangeChange,
  commissionsDateRange,
  onCommissionsDateRangeChange,
  activeTab: controlledActiveTab,
  onTabChange,
}: DashboardBookingsCommissionsProps) {
  const [localTab, setLocalTab] =
    React.useState<BookingsCommissionsTab>("bookings");

  const activeTab = controlledActiveTab ?? localTab;
  const setActiveTab = useCallback(
    (v: BookingsCommissionsTab) => {
      onTabChange?.(v);
      setLocalTab(v);
    },
    [onTabChange],
  );

  const bookingsRangeAsDate: DateRange | undefined = React.useMemo(() => {
    if (!bookingsDateRange.from_date || !bookingsDateRange.to_date)
      return undefined;
    return {
      from: new Date(bookingsDateRange.from_date),
      to: new Date(bookingsDateRange.to_date),
    };
  }, [bookingsDateRange.from_date, bookingsDateRange.to_date]);

  const commissionsRangeAsDate: DateRange | undefined = React.useMemo(() => {
    if (!commissionsDateRange.from_date || !commissionsDateRange.to_date)
      return undefined;
    return {
      from: new Date(commissionsDateRange.from_date),
      to: new Date(commissionsDateRange.to_date),
    };
  }, [commissionsDateRange.from_date, commissionsDateRange.to_date]);

  const handleBookingsDateChange = useCallback(
    (range: DateRange | undefined) => {
      if (range?.from && range?.to) {
        onBookingsDateRangeChange(
          format(range.from, "yyyy-MM-dd"),
          format(range.to, "yyyy-MM-dd")
        );
      } else {
        onBookingsDateRangeChange(undefined, undefined);
      }
    },
    [onBookingsDateRangeChange]
  );

  const handleCommissionsDateChange = useCallback(
    (range: DateRange | undefined) => {
      if (range?.from && range?.to) {
        onCommissionsDateRangeChange(
          format(range.from, "yyyy-MM-dd"),
          format(range.to, "yyyy-MM-dd")
        );
      } else {
        onCommissionsDateRangeChange(undefined, undefined);
      }
    },
    [onCommissionsDateRangeChange]
  );

  return (
    <section className="w-full relative text-black">
      <section className="w-full relative bg-background border shadow-sm p-6 rounded-lg">
        <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as BookingsCommissionsTab)}
            className="w-full"
          >
          <header className="w-full mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="text-2xl title-header font-bold shrink-0">
              Bookings & Commissions
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
              <TabsList className="shrink-0">
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="commissions">Commissions</TabsTrigger>
              </TabsList>
              <div className="w-full min-w-0 sm:w-[280px] shrink-0">
                {activeTab === "bookings" ? (
                  <DateRangePicker
                    date={bookingsRangeAsDate}
                    onDateChange={handleBookingsDateChange}
                    placeholder="Filter by date range"
                    showClear={true}
                    showApplyButton
                    className="w-full sm:w-[280px]"
                  />
                ) : (
                  <DateRangePicker
                    date={commissionsRangeAsDate}
                    onDateChange={handleCommissionsDateChange}
                    placeholder="Filter by date range"
                    showClear={true}
                    showApplyButton
                    className="w-full sm:w-[280px]"
                  />
                )}
              </div>
            </div>
          </header>
          <main className="w-full">
            <TabsContent value="bookings" className="mt-0">
              <OrderCard orders={bookingsCards} />
            </TabsContent>

            <TabsContent value="commissions" className="mt-0">
              <OrderCard orders={commissionsCards} columns={2} />
            </TabsContent>
          </main>
        </Tabs>
      </section>
    </section>
  );
}
