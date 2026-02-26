"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import { toSentenceCase } from "@/lib/utils";
import OrderCard from "./dashboard-order-card";
import { Order, Orders, BookingsStats, CommissionsStats } from "../_lib/types";

const periodKeys: (keyof Orders)[] = ["today", "weekly", "monthly", "yearly"];

export type BookingsCommissionsTab = "bookings" | "commissions";

interface DashboardBookingsCommissionsProps {
  bookingsStats: BookingsStats;
  commissionsStats: CommissionsStats;
  /** When provided, Bookings period is controlled by parent (API: booking_period) */
  bookingsPeriod?: keyof Orders;
  onBookingsPeriodChange?: (period: keyof Orders) => void;
  /** When provided, Commissions period is controlled by parent (API: comission_period) */
  commissionsPeriod?: keyof Orders;
  onCommissionsPeriodChange?: (period: keyof Orders) => void;
  /** When provided, section tab is controlled (enables deferred commission API fetch) */
  activeTab?: BookingsCommissionsTab;
  onTabChange?: (tab: BookingsCommissionsTab) => void;
}

export default function DashboardBookingsCommissions({
  bookingsStats,
  commissionsStats,
  bookingsPeriod: controlledBookingsPeriod,
  onBookingsPeriodChange,
  commissionsPeriod: controlledCommissionsPeriod,
  onCommissionsPeriodChange,
  activeTab: controlledActiveTab,
  onTabChange,
}: DashboardBookingsCommissionsProps) {
  const [localTab, setLocalTab] =
    React.useState<BookingsCommissionsTab>("bookings");
  const [localBookingsPeriod, setLocalBookingsPeriod] =
    React.useState<keyof Orders>("today");
  const [localCommissionsPeriod, setLocalCommissionsPeriod] =
    React.useState<keyof Orders>("today");

  const activeTab = controlledActiveTab ?? localTab;
  const setActiveTab = React.useCallback(
    (v: BookingsCommissionsTab) => {
      onTabChange?.(v);
      setLocalTab(v);
    },
    [onTabChange],
  );

  const activeBookingsPeriod = controlledBookingsPeriod ?? localBookingsPeriod;
  const activeCommissionsPeriod = controlledCommissionsPeriod ?? localCommissionsPeriod;

  const setBookingsPeriod = React.useCallback(
    (v: keyof Orders) => {
      onBookingsPeriodChange?.(v);
      setLocalBookingsPeriod(v);
    },
    [onBookingsPeriodChange],
  );
  const setCommissionsPeriod = React.useCallback(
    (v: keyof Orders) => {
      onCommissionsPeriodChange?.(v);
      setLocalCommissionsPeriod(v);
    },
    [onCommissionsPeriodChange],
  );

  const bookingsCards = React.useMemo(
    () => bookingsStats[activeBookingsPeriod] ?? [],
    [bookingsStats, activeBookingsPeriod],
  );
  const commissionCards = React.useMemo(
    () => commissionsStats[activeCommissionsPeriod] ?? [],
    [commissionsStats, activeCommissionsPeriod],
  );

  return (
    <section className="w-full flex items-center justify-between relative text-black">
      <section className="w-full relative bg-background dark:border p-6 rounded-md">
        <header className="w-full mb-6">
          <h2 className="text-2xl title-header font-bold">
            Bookings & Commissions
          </h2>
        </header>
        <main className="w-full">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as BookingsCommissionsTab)}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="commissions">Commissions</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="mt-6">
              <Tabs
                defaultValue="today"
                value={activeBookingsPeriod}
                onValueChange={(v) => setBookingsPeriod(v as keyof Orders)}
              >
                <TabsList className="mb-4">
                  {periodKeys.map((key) => (
                    <TabsTrigger key={key} value={key}>
                      {toSentenceCase(key)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <OrderCard orders={bookingsCards} />
              </Tabs>
            </TabsContent>

            <TabsContent value="commissions" className="mt-6">
              <Tabs
                defaultValue="today"
                value={activeCommissionsPeriod}
                onValueChange={(v) => setCommissionsPeriod(v as keyof Orders)}
              >
                <TabsList className="mb-4">
                  {periodKeys.map((key) => (
                    <TabsTrigger key={key} value={key}>
                      {toSentenceCase(key)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <OrderCard orders={commissionCards} columns={2} />
              </Tabs>
            </TabsContent>
          </Tabs>
        </main>
      </section>
    </section>
  );
}
