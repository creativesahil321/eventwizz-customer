import type { BookingDateSource } from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/build-line-items";
import type {
  BookingDetailsAddonPackage,
  BookingDetailsAddonTable,
  BookingDetailsAddonTicket,
  BookingDetailsPackage,
  BookingDetailsTable,
  BookingDetailsTicket,
  BookingTableAllocation,
} from "@/services/customer/bookings/type";
import type {
  VendorBookingDetail,
  VendorBookingDrink,
  VendorBookingEventDate,
  VendorBookingTable,
  VendorBookingTicket,
} from "@/services/vendor/bookings/bookings.service";
import { normalizePaymentStatusForAddOnsDate } from "@/lib/booking-addons-eligibility";
import { normalizeTableAllocations } from "@/lib/booking-table-allocation";
import type { BookingDate } from "./add-ons/types";
import { normalizeVendorPaymentStatus } from "./vendor-booking-status";

export interface VendorCheckoutDate extends BookingDateSource {
  booking_date_id: number;
  is_menu_choice?: boolean;
  total: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number | null;
  paymentStatus: ReturnType<typeof normalizeVendorPaymentStatus>;
  paymentStatusLabel?: string;
  paymentStatusRaw: string;
  addOnsPaymentStatus: ReturnType<typeof normalizePaymentStatusForAddOnsDate>;
}

export interface MappedVendorBookingCheckout {
  bookingNumber: string;
  eventName: string;
  location: string;
  paymentStatus: string;
  isMenuChoice: boolean;
  drinkTitle?: string;
  summary: {
    subTotal: number;
    addOns: number;
    total: number;
    paid: number;
    outstanding: number;
  };
  dates: VendorCheckoutDate[];
  addOnsTabDates: BookingDate[];
}

function mapAllocations(
  allocation: VendorBookingTable["allocation"],
  tableSize: number,
): BookingTableAllocation[] {
  return normalizeTableAllocations(allocation).map((entry, idx) => ({
    id: Number.parseInt(entry.key, 10) || idx + 1,
    label: entry.tableLabel,
    people: entry.seats,
    capacity: tableSize,
    seats_label: `${entry.tableLabel}: ${entry.seats} / ${tableSize} seat${tableSize === 1 ? "" : "s"}`,
  }));
}

function mapVendorTable(
  table: VendorBookingTable,
  idx: number,
  isAddon = false,
): BookingDetailsTable {
  return {
    id: idx + 1,
    name: `Table of ${table.table_size}`,
    unit_price: table.price_per_person,
    quantity: table.people,
    total_amount: table.total,
    table_size: table.table_size,
    table_count: table.no_tables,
    allocations: mapAllocations(table.allocation, table.table_size),
    is_addon: isAddon,
    purchase_type: isAddon ? "addon" : "checkout",
  };
}

function mapVendorTicket(
  ticket: VendorBookingTicket,
  idx: number,
  isAddon = false,
): BookingDetailsTicket {
  return {
    id: ticket.id ?? idx + 1,
    name: ticket.title,
    description: ticket.description,
    unit_price: ticket.price_per_ticket,
    quantity: ticket.quantity,
    total_amount: ticket.total,
    is_addon: isAddon,
    purchase_type: isAddon ? "addon" : "checkout",
  };
}

function mapVendorDrink(
  drink: VendorBookingDrink,
  idx: number,
  isAddon = false,
): BookingDetailsPackage {
  return {
    id: drink.id ?? idx + 1,
    name: drink.title,
    unit_price: drink.price,
    quantity: drink.quantity,
    total_amount: drink.total,
    is_addon: isAddon,
    purchase_type: isAddon ? "addon" : "checkout",
  };
}

function mapAddonTable(table: VendorBookingTable, idx: number): BookingDetailsAddonTable {
  return {
    id: idx + 1,
    booking_date_table_id: table.table_size,
    name: `Table of ${table.table_size}`,
    unit_price: table.price_per_person,
    quantity: table.people,
    total_amount: table.total,
    table_size: table.table_size,
    table_count: table.no_tables,
    allocations: mapAllocations(table.allocation, table.table_size),
  };
}

function mapAddonTicket(ticket: VendorBookingTicket, idx: number): BookingDetailsAddonTicket {
  return {
    id: ticket.id,
    booking_date_ticket_id: ticket.id,
    name: ticket.title,
    description: ticket.description,
    unit_price: ticket.price_per_ticket,
    quantity: ticket.quantity,
    total_amount: ticket.total,
  };
}

function mapAddonDrink(drink: VendorBookingDrink, idx: number): BookingDetailsAddonPackage {
  return {
    id: drink.id,
    booking_date_package_id: drink.id,
    name: drink.title,
    unit_price: drink.price,
    quantity: drink.quantity,
    total_amount: drink.total,
  };
}

function resolvePreviousDateLabel(
  parent: VendorBookingEventDate["parent_booking_date"],
): string | null {
  if (!parent) return null;
  if (typeof parent === "string") return parent;
  return parent.date ?? null;
}

function mapEventDate(
  date: VendorBookingEventDate,
  formatCurrency: (value: number | string) => string,
  drinkTitle?: string,
  isMenuChoice?: boolean,
): VendorCheckoutDate {
  const pendingAmount =
    date.pending_payment != null && date.pending_payment > 0
      ? date.pending_payment
      : Math.max(date.total_amount - date.paid_amount, 0) || null;

  const paymentStatusRaw = date.payment_status?.trim() || "Pending";

  return {
    id: date.date_key,
    date_key: date.date_key,
    booking_date_id: date.booking_date_id,
    is_menu_choice: isMenuChoice,
    date: date.date,
    previous_date_label: resolvePreviousDateLabel(date.parent_booking_date),
    package_title: drinkTitle,
    paymentStatus: normalizeVendorPaymentStatus(paymentStatusRaw),
    paymentStatusLabel: paymentStatusRaw,
    paymentStatusRaw,
    addOnsPaymentStatus: normalizePaymentStatusForAddOnsDate(paymentStatusRaw),
    total: formatCurrency(date.total_amount),
    totalAmount: date.total_amount,
    paidAmount: date.paid_amount,
    pendingAmount: pendingAmount && pendingAmount > 0 ? pendingAmount : null,
    tickets: (date.tickets ?? []).map((t, i) => mapVendorTicket(t, i)),
    packages: (date.drinks ?? []).map((d, i) => mapVendorDrink(d, i)),
    tables: (date.tables ?? []).map((t, i) => mapVendorTable(t, i)),
    addons: {
      tables: (date.addons?.tables ?? []).map(mapAddonTable),
      tickets: (date.addons?.tickets ?? []).map(mapAddonTicket),
      packages: (date.addons?.drinks ?? []).map(mapAddonDrink),
      total_amount: date.addons?.total_amount,
    },
  };
}

export function mapVendorBookingToCheckout(
  booking: VendorBookingDetail,
  formatCurrency: (value: number | string) => string,
): MappedVendorBookingCheckout {
  const subTotal = booking.sub_total ?? 0;
  const addOns = booking.addons_amount ?? 0;
  const total = booking.total ?? 0;
  const paid = booking.paid_amount ?? 0;
  const outstanding =
    booking.pending_payment != null
      ? booking.pending_payment
      : Math.max(total - paid, 0);

  const dates = booking.event_dates.map((date) =>
    mapEventDate(date, formatCurrency, booking.drink_title, booking.is_menu_choice),
  );

  const addOnsTabDates: BookingDate[] = dates.map((date) => ({
    id: date.date_key ?? date.id,
    date: date.date,
    people:
      date.tables?.reduce((sum, table) => sum + (table.quantity ?? 0), 0) ?? 0,
    paymentStatus: date.addOnsPaymentStatus,
  }));

  return {
    bookingNumber: booking.booking_number || String(booking.booking_id),
    eventName: booking.event_name,
    location: booking.location,
    paymentStatus: booking.payment_status?.trim() || "",
    isMenuChoice: booking.is_menu_choice,
    drinkTitle: booking.drink_title,
    summary: {
      subTotal,
      addOns,
      total,
      paid,
      outstanding,
    },
    dates,
    addOnsTabDates,
  };
}
