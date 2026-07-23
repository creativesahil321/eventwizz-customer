"use client";

import { useCustomerDashboard } from "@/services/customer/dashboard";
import type { CustomerDashboardUpcomingEvent } from "@/services/customer/dashboard";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import DashboardEvents from "./dashboard-events";
import DashboardRecentBookings from "./dashboard-recent-bookings";
import DashboardNearbyEvents from "./dashboard-nearby-events";
import { CustomerDashboardSkeleton } from "./customer-dashboard-skeleton";

/** Event shape expected by DashboardEvents */
interface DashboardEventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  ticketType: string;
  eventSlug?: string;
  locationSlug?: string;
}

function mapUpcomingEvents(
  raw: CustomerDashboardUpcomingEvent[],
  defaultLocationSlug: string | null
): DashboardEventItem[] {
  return raw.map((e, i) => ({
    id: String(e.booking_date_id ?? e.id ?? e.event_slug ?? i),
    title: e.title ?? e.event_name ?? "Event",
    date: e.date ?? new Date().toISOString().slice(0, 10),
    location: e.location ?? "—",
    ticketType: e.ticketType ?? e.ticket_type ?? "—",
    eventSlug: e.event_slug,
    locationSlug: e.location_slug ?? defaultLocationSlug ?? undefined,
  }));
}

export default function CustomerDashboardContent() {
  const { data, isLoading, isError, error } = useCustomerDashboard();
  const { settings } = useDomain();

  if (isLoading && !data) {
    return <CustomerDashboardSkeleton />;
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

  const defaultLocationSlug =
    settings?.locations?.find((l) => l.is_default)?.slug ??
    settings?.locations?.[0]?.slug ??
    null;

  return (
    <>
      <section className="w-full relative">
        <DashboardEvents
          title="My Upcoming Events"
          events={mapUpcomingEvents(upcomingEvents, defaultLocationSlug)}
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
