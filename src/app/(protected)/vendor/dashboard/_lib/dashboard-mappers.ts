/**
 * Mappers from vendor dashboard API response to UI shapes
 */

import type {
  VendorDashboardSummary,
  VendorDashboardBookingsStats,
  VendorDashboardCommissionsStats,
  VendorDashboardRecentBooking,
  VendorDashboardLastEventItem,
} from "@/services/vendor/dashboard/type";
import type { Booking } from "./types";

/** Summary card item (non-clickable) */
export interface SummaryItem {
  title: string;
  value: number;
}

/** Order/stat card item */
export interface OrderCardItem {
  title: string;
  value: number;
}

/** BestSales / Last Event item */
export interface BestSaleItem {
  icon: string;
  venue_name: string;
  price: string;
}

export function mapSummaryToItems(summary: VendorDashboardSummary): SummaryItem[] {
  return [
    { title: "Total Events", value: summary.total_events },
    { title: "Active Event", value: summary.active_events },
    { title: "Past Events", value: summary.past_events },
    { title: "Draft Event", value: summary.draft_events },
  ];
}

export function mapBookingsStatsToOrders(
  stats: VendorDashboardBookingsStats
): OrderCardItem[] {
  return [
    { title: "Total Bookings", value: stats.total_bookings },
    { title: "Total Payment", value: stats.total_payment },
    { title: "Partial Payment", value: stats.pending_partial_payment },
    { title: "Received Payment", value: stats.received_payment },
  ];
}

export function mapCommissionsStatsToOrders(
  stats: VendorDashboardCommissionsStats | undefined
): OrderCardItem[] {
  if (!stats) {
    return [
      { title: "Total Commission", value: 0 },
      { title: "Commission Due", value: 0 },
    ];
  }
  const totalCommission =
    stats.total_commission ?? stats.total_payment ?? 0;
  const commissionDue =
    stats.commission_due ?? stats.pending_partial_payment ?? 0;
  return [
    { title: "Total Commission", value: totalCommission },
    { title: "Commission Due", value: commissionDue },
  ];
}

/**
 * Map API recent_booking to table row shape (Booking).
 * id is booking_id when present (for navigation to /vendor/booking-history/[id]), else transaction_id.
 */
export function mapRecentBookingToTableRow(
  row: VendorDashboardRecentBooking
): Booking {
  return {
    id: String(row.booking_id),
    transaction_id: row.transaction_id,
    event_name: row.event,
    user: { user_name: row.customer },
    user_name: row.customer,
    booking_date: row.order_date,
    tickets: 0,
    total_table: 0,
    total_people: 0,
    paid_amount: row.total - row.balance_due,
    balance_amount: row.balance_due,
    discount: 0,
    total_amount: row.total,
    payment_status: row.status,
    transaction_history: [],
    date: row.order_date,
    amount: row.total,
    status: row.status,
    created_at: row.order_date,
  };
}

export function mapRecentBookingsToTableRows(
  rows: VendorDashboardRecentBooking[]
): Booking[] {
  return rows.map(mapRecentBookingToTableRow);
}

export function mapLastEventToBestSale(item: VendorDashboardLastEventItem): BestSaleItem {
  return {
    icon: "",
    venue_name: item.event_name,
    price: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(item.amount),
  };
}

export function mapLastEventOverviewToBestSales(
  items: VendorDashboardLastEventItem[]
): BestSaleItem[] {
  return items.map(mapLastEventToBestSale);
}
