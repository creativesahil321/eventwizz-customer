import type {
  BookingDetailsAddons,
  BookingDetailsPackage,
  BookingDetailsTable,
  BookingDetailsTicket,
  BookingTableAllocation,
} from "@/services/customer/bookings/type";
import type { CheckoutLineItem, PaymentBreakdownGroup } from "./types";
import { formatDate } from "@/lib/utils";

/** Compact label for date strip cards: "Mon, Aug 10, 2026" */
export function formatDateStripLabel(
  dateKey: string,
  fallbackLabel?: string,
): string {
  const fromKey = formatDate(`${dateKey}T12:00:00`, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (fromKey) return fromKey;

  if (!fallbackLabel) return dateKey;

  return fallbackLabel
    .replace(
      /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g,
      (day) => day.slice(0, 3),
    )
    .replace(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g,
      (month) => month.slice(0, 3),
    );
}

export interface BookingDateSource {
  id: string;
  date: string;
  room_name?: string;
  item_summary?: string;
  tickets?: BookingDetailsTicket[];
  packages?: BookingDetailsPackage[];
  tables?: BookingDetailsTable[];
  addons?: BookingDetailsAddons;
}

function formatAllocations(
  allocations: BookingTableAllocation[] | undefined,
): { label: string; value: string }[] {
  if (!allocations?.length) return [];
  return allocations.map((row) => ({
    label: row.label,
    value: `${row.people} ${row.people === 1 ? "Person" : "People"}`,
  }));
}

export function buildLineItemsForDate(
  date: BookingDateSource,
  formatUnit: (amount: number) => string,
): CheckoutLineItem[] {
  const items: CheckoutLineItem[] = [];

  date.tickets?.forEach((ticket, idx) => {
    items.push({
      id: `ticket-${date.id}-${ticket.id}-${idx}`,
      kind: "ticket",
      name: ticket.name,
      description: ticket.description ?? undefined,
      meta: `${formatUnit(ticket.unit_price)} × ${ticket.quantity}`,
      amount: ticket.total_amount,
    });
  });

  date.packages?.forEach((pkg, idx) => {
    items.push({
      id: `package-${date.id}-${pkg.id}-${idx}`,
      kind: "package",
      name: pkg.name,
      description: pkg.description ?? undefined,
      meta: `${formatUnit(pkg.unit_price)} × ${pkg.quantity}`,
      amount: pkg.total_amount,
    });
  });

  date.tables?.forEach((table, idx) => {
    items.push({
      id: `table-${date.id}-${table.id}-${idx}`,
      kind: "table",
      name: table.name || `Table of ${table.table_size}`,
      description: table.description ?? undefined,
      meta: `${formatUnit(table.unit_price)} × ${table.quantity}`,
      amount: table.total_amount,
      allocation: formatAllocations(table.allocations),
      quantity: table.table_count > 1 ? table.table_count : undefined,
      showMenuChoices: true,
    });
  });

  date.addons?.tables?.forEach((table, idx) => {
    items.push({
      id: `addon-table-${date.id}-${idx}`,
      kind: "addon",
      name: table.name || `Table of ${table.table_size}`,
      meta: `${formatUnit(table.unit_price)} × ${table.quantity}`,
      amount: table.total_amount,
      allocation: formatAllocations(table.allocations),
      deletable: true,
      deletePayload: {
        type: "table",
        keyword: table.booking_date_table_id ?? table.id ?? table.table_size,
      },
    });
  });

  date.addons?.tickets?.forEach((ticket, idx) => {
    items.push({
      id: `addon-ticket-${date.id}-${idx}`,
      kind: "addon",
      name: ticket.name,
      description: ticket.description ?? undefined,
      meta: `${formatUnit(ticket.unit_price)} × ${ticket.quantity}`,
      amount: ticket.total_amount ?? ticket.unit_price * ticket.quantity,
      deletable: true,
      deletePayload: {
        type: "ticket",
        keyword: ticket.booking_date_ticket_id ?? ticket.id ?? ticket.name,
      },
    });
  });

  date.addons?.packages?.forEach((pkg, idx) => {
    items.push({
      id: `addon-package-${date.id}-${idx}`,
      kind: "addon",
      name: pkg.name,
      description: pkg.description ?? undefined,
      meta: `${formatUnit(pkg.unit_price)} × ${pkg.quantity}`,
      amount: pkg.total_amount ?? pkg.unit_price * pkg.quantity,
      deletable: true,
      deletePayload: {
        type: "package",
        keyword: pkg.booking_date_package_id ?? pkg.id ?? pkg.name,
      },
    });
  });

  return items;
}

export function buildPaymentBreakdown(
  dates: BookingDateSource[],
  formatUnit: (amount: number) => string,
  addOnsTotal: number,
): PaymentBreakdownGroup[] {
  const groups: PaymentBreakdownGroup[] = dates.map((date) => {
    const lines = buildLineItemsForDate(date, formatUnit)
      .filter((item) => item.kind !== "addon")
      .map((item) => ({
        id: item.id,
        label: item.name,
        meta: `${date.date} · ${item.meta}`,
        amount: item.amount,
      }));

    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);

    return {
      id: date.id,
      title: date.date,
      subtotal,
      lines,
    };
  });

  const addonLines: PaymentBreakdownGroup["lines"] = [];
  dates.forEach((date) => {
    buildLineItemsForDate(date, formatUnit)
      .filter((item) => item.kind === "addon")
      .forEach((item) => {
        addonLines.push({
          id: item.id,
          label: item.name,
          meta: `${date.date} · ${item.meta}`,
          amount: item.amount,
          isAddon: true,
        });
      });
  });

  if (addonLines.length > 0 || addOnsTotal > 0) {
    groups.push({
      id: "extras",
      title: "Extras & add-ons",
      subtotal: addonLines.reduce((s, l) => s + l.amount, 0) || addOnsTotal,
      lines: addonLines,
      isExtras: true,
    });
  }

  return groups;
}

/** Fallback subtitle when room name is not shown on date cards */
export function buildDateSubtitle(date: BookingDateSource): string | undefined {
  if (date.item_summary?.trim()) return date.item_summary.trim();

  const tables =
    (date.tables?.length ?? 0) +
    (date.addons?.tables?.length ?? 0);
  const tickets =
    (date.tickets?.reduce((s, t) => s + t.quantity, 0) ?? 0) +
    (date.addons?.tickets?.reduce((s, t) => s + t.quantity, 0) ?? 0);

  const parts: string[] = [];
  if (tables > 0) parts.push(`${tables} ${tables === 1 ? "table" : "tables"}`);
  if (tickets > 0)
    parts.push(`${tickets} ${tickets === 1 ? "ticket" : "tickets"}`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
