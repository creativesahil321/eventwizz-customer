import type {
  BookingDetailsAddonBreakdown,
  BookingDetailsAddons,
  BookingDetailsAddonPackage,
  BookingDetailsPackage,
  BookingDetailsTable,
  BookingDetailsTicket,
  BookingTableAllocation,
} from "@/services/customer/bookings/type";
import type {
  AddonBreakdownLine,
  AllocationPill,
  CheckoutLineItem,
  DateLineItemsSplit,
  PaymentBreakdownGroup,
} from "./types";
import { formatDate } from "@/lib/utils";
import { parseRoomDateKey } from "@/app/(public)/vendor/checkout/_lib/cart-calculations";

/** Month/day chip for single-date event strip, e.g. JUN / 26 */
export function getDateCalendarParts(dateKey: string): {
  month: string;
  day: number;
} {
  const { date: isoDate } = parseRoomDateKey(dateKey);
  const parsed = new Date(`${isoDate}T12:00:00`);
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
  /** Raw event date (YYYY-MM-DD) for API calls */
  date_key?: string;
  room_id?: number;
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
  tableSize?: number,
): AllocationPill[] { 
  if (!allocations?.length) return [];
  return allocations.map((row) => {
    const capacity = row.capacity ?? tableSize ?? row.people;
    const occupied = row.people;
    const seatsLabel =
      row.seats_label?.trim() ||
      `${row.label}: ${occupied} / ${capacity} seat${capacity === 1 ? "" : "s"}`;

    return {
      id: row.id,
      label: row.label,
      value: `${occupied} ${occupied === 1 ? "Person" : "People"}`,
      seatsLabel,
      occupied,
      capacity,
    };
  });
}

function formatTableLineMeta(
  table: Pick<
    BookingDetailsTable,
    "unit_price" | "quantity" | "guest_pricing_label"
  >,
  formatUnit: (amount: number) => string,
): string {
  const unitPrice = parseUnitPrice(table.unit_price);
  const guestCount = table.quantity;

  if (guestCount > 0 && unitPrice >= 0) {
    return `${formatUnit(unitPrice)} × ${guestCount} guest${guestCount === 1 ? "" : "s"}`;
  }

  const apiLabel = table.guest_pricing_label?.trim();
  return apiLabel || `${formatUnit(unitPrice)} × ${guestCount || 1}`;
}

function parseUnitPrice(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseFloat(value.replace(/[£$€₹¥,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeLineAmount(value: unknown): number {
  return parseUnitPrice(value);
}

function normalizeGroupLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function addonPackageGroupKey(name: string, unitPrice: number, type: string): string {
  return `${type}|${normalizeGroupLabel(name)}|${parseUnitPrice(unitPrice).toFixed(2)}`;
}

function isPaidAddonRecord(item: {
  purchase_type?: string;
  is_addon?: boolean;
}): boolean {
  return item.is_addon === true || item.purchase_type === "addon";
}

function mapAddonBreakdown(
  breakdown?: BookingDetailsAddonBreakdown[],
): AddonBreakdownLine[] | undefined {
  if (!breakdown?.length) return undefined;
  return breakdown.map((entry) => ({
    id: entry.id,
    label: entry.label,
    amount: entry.amount,
    quantity: entry.quantity,
    seats: entry.seats,
  }));
}

function resolveCheckoutAddonBreakdown(item: {
  addon_breakdown?: BookingDetailsAddonBreakdown[];
  has_addon_breakdown?: boolean;
}): AddonBreakdownLine[] | undefined {
  if (item.has_addon_breakdown === false) return undefined;
  return mapAddonBreakdown(item.addon_breakdown);
}

function getAddonPackages(date: BookingDateSource): BookingDetailsAddonPackage[] {
  const packages = date.addons?.packages ?? [];
  const legacyDrinks =
    (date.addons as { drinks?: BookingDetailsAddonPackage[] } | undefined)
      ?.drinks ?? [];
  return [...packages, ...legacyDrinks];
}

function buildMenuChoiceContext(
  date: BookingDateSource,
  table: { allocations?: BookingTableAllocation[]; table_size: number },
  bookingId?: number,
): CheckoutLineItem["menuChoiceContext"] {
  if (!bookingId || !date.date_key || !table.allocations?.length) {
    return undefined;
  }

  return {
    bookingId,
    dateKey: date.date_key,
    ...(date.room_id != null &&
      date.room_id > 0 && { roomId: date.room_id }),
    tableAllocations: table.allocations.map((a) => ({
      id: a.id,
      label: a.label,
      people: a.people,
      capacity: a.capacity ?? table.table_size,
    })),
  };
}

function pushPaidAddonBookingItem(
  items: CheckoutLineItem[],
  line: Omit<CheckoutLineItem, "isPaidAddonHistory">,
) {
  items.push({
    ...line,
    isPaidAddonHistory: true,
  });
}

export function buildLineItemsForDate(
  date: BookingDateSource,
  formatUnit: (amount: number) => string,
  options?: { bookingId?: number },
): CheckoutLineItem[] {
  const items: CheckoutLineItem[] = [];

  date.tickets?.forEach((ticket, idx) => {
    const base = {
      id: `ticket-${date.id}-${ticket.id}-${idx}`,
      kind: "ticket" as const,
      name: ticket.name,
      description: ticket.description ?? undefined,
      meta: `${formatUnit(parseUnitPrice(ticket.unit_price))} × ${ticket.quantity}`,
      amount: normalizeLineAmount(ticket.total_amount),
      unitPrice: ticket.unit_price,
      quantity: ticket.quantity,
    };

    if (isPaidAddonRecord(ticket)) {
      pushPaidAddonBookingItem(items, base);
      return;
    }

    items.push({
      ...base,
      addonBreakdown: resolveCheckoutAddonBreakdown(ticket),
      addonExtraTotal: ticket.addon_extra_total,
      hasAddonBreakdown: ticket.has_addon_breakdown,
    });
  });

  date.packages?.forEach((pkg, idx) => {
    const base = {
      id: `package-${date.id}-${pkg.id}-${idx}`,
      kind: "package" as const,
      name: pkg.name,
      description: pkg.description ?? undefined,
      meta: `${formatUnit(parseUnitPrice(pkg.unit_price))} × ${pkg.quantity}`,
      amount: normalizeLineAmount(pkg.total_amount),
      unitPrice: pkg.unit_price,
      quantity: pkg.quantity,
    };

    if (isPaidAddonRecord(pkg)) {
      pushPaidAddonBookingItem(items, base);
      return;
    }

    items.push({
      ...base,
      addonBreakdown: resolveCheckoutAddonBreakdown(pkg),
      addonExtraTotal: pkg.addon_extra_total,
      hasAddonBreakdown: pkg.has_addon_breakdown,
    });
  });

  date.tables?.forEach((table, idx) => {
    const base = {
      id: `table-${date.id}-${table.id}-${idx}`,
      kind: "table" as const,
      name: table.name || `Table of ${table.table_size}`,
      description: table.description ?? undefined,
      meta: formatTableLineMeta(table, formatUnit),
      amount: normalizeLineAmount(table.total_amount),
      unitPrice: table.unit_price,
      quantity: table.table_count > 1 ? table.table_count : undefined,
      showMenuChoices: true,
    };

    const menuChoiceContext = buildMenuChoiceContext(
      date,
      table,
      options?.bookingId,
    );

    if (isPaidAddonRecord(table)) {
      pushPaidAddonBookingItem(items, {
        ...base,
        allocation: formatAllocations(table.allocations, table.table_size),
        showMenuChoices: true,
        menuChoiceContext,
      });
      return;
    }

    items.push({
      ...base,
      addonBreakdown: resolveCheckoutAddonBreakdown(table),
      addonExtraTotal: table.addon_extra_total,
      addonExtraLabel: table.addon_extra_label,
      hasAddonBreakdown: table.has_addon_breakdown,
      allocation: formatAllocations(table.allocations, table.table_size),
      menuChoiceContext,
    });
  });

  date.addons?.tables?.forEach((table, idx) => {
    const unitPrice = parseUnitPrice(table.unit_price);
    const menuChoiceContext = buildMenuChoiceContext(
      date,
      table,
      options?.bookingId,
    );
    items.push({
      id: `addon-table-${date.id}-${idx}`,
      kind: "table",
      name: table.name || `Table of ${table.table_size}`,
      meta: `${formatUnit(unitPrice)} × ${table.quantity}`,
      amount: normalizeLineAmount(table.total_amount),
      unitPrice,
      quantity: table.table_count && table.table_count > 1 ? table.table_count : undefined,
      allocation: formatAllocations(table.allocations, table.table_size),
      showMenuChoices: true,
      menuChoiceContext,
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

function groupPaidHistoryBookingItems(
  items: CheckoutLineItem[],
  formatUnit: (amount: number) => string,
): CheckoutLineItem[] {
  const tables: CheckoutLineItem[] = [];
  const groups = new Map<string, CheckoutLineItem>();

  items.forEach((item) => {
    if (item.kind === "table") {
      tables.push(item);
      return;
    }

    const unitPrice = parseUnitPrice(item.unitPrice);
    const key = `${item.kind}|${normalizeGroupLabel(item.name)}|${unitPrice.toFixed(2)}`;
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
  options?: { bookingId?: number },
): DateLineItemsSplit {
  const all = buildLineItemsForDate(date, formatUnit, options);
  const rawBooking = all.filter((item) => !item.isSavedAddon);
  const checkoutLines = rawBooking.filter((item) => !item.isPaidAddonHistory);
  const paidHistory = rawBooking.filter((item) => item.isPaidAddonHistory);
  const bookingItems = [
    ...checkoutLines,
    ...groupPaidHistoryBookingItems(paidHistory, formatUnit),
  ];
  const pendingAddons = all.filter((item) => item.isSavedAddon);
  const addonItems = groupAddonLineItems(pendingAddons, formatUnit);

  return {
    bookingItems,
    addonItems,
    addonTotal: pendingAddons.reduce((sum, item) => sum + item.amount, 0),
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
