import type {
  BookingDetailsAddons,
  BookingDetailsAddonPackage,
  BookingDetailsPackage,
  BookingDetailsTable,
  BookingDetailsTicket,
  BookingTableAllocation,
} from "@/services/customer/bookings/type";
import type { CheckoutLineItem, DateLineItemsSplit, PaymentBreakdownGroup } from "./types";
import { formatDate } from "@/lib/utils";

/** Month/day chip for single-date event strip, e.g. JUN / 26 */
export function getDateCalendarParts(dateKey: string): {
  month: string;
  day: number;
} {
  const parsed = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { month: "---", day: 0 };
  }

  return {
    month: parsed
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase(),
    day: parsed.getDate(),
  };
}

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
  package_title?: string;
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
    id: row.id,
    label: row.label,
    value: `${row.people} ${row.people === 1 ? "Person" : "People"}`,
  }));
}

function parseUnitPrice(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeGroupLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function addonPackageGroupKey(name: string, unitPrice: number, type: string): string {
  return `${type}|${normalizeGroupLabel(name)}|${parseUnitPrice(unitPrice).toFixed(2)}`;
}

function getAddonPackages(date: BookingDateSource): BookingDetailsAddonPackage[] {
  const packages = date.addons?.packages ?? [];
  const legacyDrinks =
    (date.addons as { drinks?: BookingDetailsAddonPackage[] } | undefined)
      ?.drinks ?? [];
  return [...packages, ...legacyDrinks];
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
    const unitPrice = parseUnitPrice(table.unit_price);
    items.push({
      id: `addon-table-${date.id}-${idx}`,
      kind: "table",
      name: table.name || `Table of ${table.table_size}`,
      meta: `${formatUnit(unitPrice)} × ${table.quantity}`,
      amount: table.total_amount,
      unitPrice,
      quantity: table.table_count && table.table_count > 1 ? table.table_count : undefined,
      allocation: formatAllocations(table.allocations),
      isSavedAddon: true,
      deletable: true,
      deletePayload: {
        type: "table",
        keyword: table.booking_date_table_id ?? table.id ?? table.table_size,
      },
    });
  });

  date.addons?.tickets?.forEach((ticket, idx) => {
    const unitPrice = parseUnitPrice(ticket.unit_price);
    const quantity = ticket.quantity ?? 1;
    items.push({
      id: `addon-ticket-${date.id}-${idx}`,
      kind: "ticket",
      name: ticket.name,
      description: ticket.description ?? undefined,
      meta: `${formatUnit(unitPrice)} × ${quantity}`,
      amount: ticket.total_amount ?? unitPrice * quantity,
      unitPrice,
      quantity,
      isSavedAddon: true,
      deletable: true,
      deletePayload: {
        type: "ticket",
        keyword: ticket.booking_date_ticket_id ?? ticket.id ?? ticket.name,
      },
    });
  });

  getAddonPackages(date).forEach((pkg, idx) => {
    const unitPrice = parseUnitPrice(pkg.unit_price);
    const quantity = pkg.quantity ?? 1;
    items.push({
      id: `addon-package-${date.id}-${pkg.id ?? idx}-${idx}`,
      kind: "package",
      name: pkg.name,
      description: pkg.description ?? undefined,
      meta: `${formatUnit(unitPrice)} × ${quantity}`,
      amount: pkg.total_amount ?? unitPrice * quantity,
      unitPrice,
      quantity,
      isSavedAddon: true,
      deletable: true,
      deletePayload: {
        type: "package",
        keyword: pkg.booking_date_package_id ?? pkg.id ?? pkg.name,
      },
    });
  });

  return items;
}

function groupAddonLineItems(
  items: CheckoutLineItem[],
  formatUnit: (amount: number) => string,
): CheckoutLineItem[] {
  const tables: CheckoutLineItem[] = [];
  const groups = new Map<string, CheckoutLineItem>();

  items.forEach((item) => {
    if (item.deletePayload?.type === "table") {
      tables.push(item);
      return;
    }

    const type = item.deletePayload?.type ?? "other";
    const unitPrice = parseUnitPrice(item.unitPrice);
    const key = addonPackageGroupKey(item.name, unitPrice, type);
    const lineQty = item.quantity ?? 1;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        ...item,
        unitPrice,
        quantity: lineQty,
        groupMembers: [{ ...item, unitPrice, quantity: lineQty }],
      });
      return;
    }

    const nextQty = (existing.quantity ?? 1) + lineQty;
    existing.quantity = nextQty;
    existing.amount += item.amount;
    existing.meta = `${formatUnit(unitPrice)} × ${nextQty}`;
    existing.groupMembers = [
      ...(existing.groupMembers ?? []),
      { ...item, unitPrice, quantity: lineQty },
    ];
  });

  return [...tables, ...Array.from(groups.values())];
}

export function splitLineItemsForDate(
  date: BookingDateSource,
  formatUnit: (amount: number) => string,
): DateLineItemsSplit {
  const all = buildLineItemsForDate(date, formatUnit);
  const bookingItems = all.filter((item) => !item.isSavedAddon);
  const rawAddons = all.filter((item) => item.isSavedAddon);
  const addonItems = groupAddonLineItems(rawAddons, formatUnit);

  return {
    bookingItems,
    addonItems,
    addonTotal: rawAddons.reduce((sum, item) => sum + item.amount, 0),
    addonLineCount: addonItems.reduce(
      (sum, item) => sum + (item.quantity ?? 1),
      0,
    ),
  };
}

export function buildPaymentBreakdown(
  dates: BookingDateSource[],
  formatUnit: (amount: number) => string,
): PaymentBreakdownGroup[] {
  return dates
    .map((date) => {
      const split = splitLineItemsForDate(date, formatUnit);

      const lines = split.bookingItems.map((item) => ({
        id: item.id,
        label: item.name,
        meta: item.meta,
        amount: item.amount,
        kind: item.kind,
      }));

      const addonLines = split.addonItems.map((item) => ({
        id: item.id,
        label: item.name,
        meta: item.meta,
        amount: item.amount,
        isAddon: true as const,
        kind: item.kind,
      }));

      const bookingSubtotal = lines.reduce((sum, line) => sum + line.amount, 0);
      const addonSubtotal = split.addonTotal;

      return {
        id: date.id,
        title: date.date,
        packageTitle: date.package_title,
        subtotal: bookingSubtotal + addonSubtotal,
        lines,
        addonLines: addonLines.length > 0 ? addonLines : undefined,
        addonSubtotal: addonLines.length > 0 ? addonSubtotal : undefined,
      };
    })
    .filter(
      (group) =>
        group.lines.length > 0 || (group.addonLines?.length ?? 0) > 0,
    );
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
