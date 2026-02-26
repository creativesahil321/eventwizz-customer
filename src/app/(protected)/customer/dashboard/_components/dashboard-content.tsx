"use client";

import { useCustomerDashboard } from "@/services/customer/dashboard";
import type { CustomerDashboardUpcomingEvent } from "@/services/customer/dashboard";
import { PageLoader } from "@/components/ui/page-loader";
import DashboardEvents from "./dashboard-events";
import DashboardRecentBookings from "./dashboard-recent-bookings";
import DashboardNearbyEvents from "./dashboard-nearby-events";

/** Event shape expected by DashboardEvents */
interface DashboardEventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  ticketType: string;
}

function mapUpcomingEvents(
  raw: CustomerDashboardUpcomingEvent[]
): DashboardEventItem[] {
  return raw.map((e, i) => ({
    id: String(e.id ?? e.event_slug ?? i),
    title: e.title ?? e.event_name ?? "Event",
    date: e.date ?? new Date().toISOString().slice(0, 10),
    time: e.time ?? "—",
    location: e.location ?? "—",
    ticketType: e.ticketType ?? e.ticket_type ?? "—",
  }));
}

export default function CustomerDashboardContent() {
  const { data, isLoading, isError, error } = useCustomerDashboard();

  if (isLoading && !data) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load dashboard"}
        </p>
      </div>
    );
  }

  const dashboardData = data?.data;
  const upcomingEvents = dashboardData?.upcoming_events ?? [];
  const recentBookings = dashboardData?.recent_bookings ?? [];

  return (
    <>
      <section className="w-full relative">
        <DashboardEvents
          title="My Upcoming Events"
          events={mapUpcomingEvents(upcomingEvents)}
        />
      </section>

      {/* Location-based nearby events — fully self-contained, handles its own loading/errors */}
      <section className="w-full relative">
        <DashboardNearbyEvents />
      </section>

      <section className="w-full relative">
        <DashboardRecentBookings bookings={recentBookings} />
      </section>
    </>
  );
}
