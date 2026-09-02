import {
  resolvePackageSectionTitle,
  type BookingDateSource,
} from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/build-line-items";
import type { VendorAddonsPaymentMode } from "@/app/(protected)/vendor/booking-history/[id]/_components/vendor-addons-payment-mode-dialog";
import { buildCartDateLookupKey } from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import { normalizePaymentStatusForAddOnsDate } from "@/lib/booking-addons-eligibility";
import type {
  BookingDetailsPackage,
  BookingDetailsTable,
  BookingDetailsTicket,
  BookingTableAllocation,
} from "@/services/customer/bookings/type";
import type {
  VendorBookingDetail,
  VendorBookingDetailDate,
  VendorBookingDrink,
  VendorBookingEventDate,
  VendorBookingTable,
  VendorBookingTicket,
  VendorStatusOption,
} from "@/services/vendor/bookings/bookings.service";
import type { BookingDate } from "./add-ons/types";
import { normalizeTableAllocations } from "@/lib/booking-table-allocation";
import {
  parseCouponCode,
  parseSavedAmount,
} from "@/lib/booking-saved-amount";
import {
  normalizeVendorPaymentStatus,
  resolvePaymentStatusCode,
} from "./vendor-booking-status";

export interface VendorCheckoutDate extends BookingDateSource {
  booking_date_id: number;
  is_menu_choice?: boolean;
  can_reschedule?: boolean;
  has_unbooked_event_dates?: boolean;
  reschedule_initiated?: boolean;
  reschedule_block_reason?: string;
  total: string;
  totalAmount: number;
  /** Present only when this date has promo savings. */
  savedAmount?: number | null;
  paidAmount: number;
  pendingAmount: number | null;
  paymentStatus: ReturnType<typeof normalizeVendorPaymentStatus>;
  paymentStatusLabel?: string;
  paymentStatusRaw: string;
  paymentStatusCode: number;
  vendorStatusOptions: VendorStatusOption[];
  addOnsPaymentStatus: ReturnType<typeof normalizePaymentStatusForAddOnsDate>;
  show_payment_mode_option?: boolean;
  unpaid_addon_payment_mode?: VendorAddonsPaymentMode;
}

export interface MappedVendorBookingCheckout {
  bookingNumber: string;
  eventName: string;
  location: string;
  /** Whole-booking order status from API `status` */
  bookingStatus: string;
  paymentStatus: string;
  canPayNow: boolean;
  isMenuChoice: boolean;
  isRoomSystem: boolean;
  drinkTitle?: string;
  /** Any date on this booking has a vendor-initiated reschedule in progress */
  rescheduleInitiated: boolean;
  summary: {
    subTotal: number;
    addOns: number;
    total: number;
    paid: number;
    outstanding: number;
    savedAmount?: number | null;
    couponCode?: string | null;
  };
  dates: VendorCheckoutDate[];
  addOnsTabDates: BookingDate[];
}

function parseAmount(value?: number | string | null): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function normalizeAddonPaymentMode(
  value?: string | null,
): VendorAddonsPaymentMode | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "online" || normalized === "offline") {
    return normalized;
  }
  return undefined;
}

function mapLegacyTicket(
  ticket: VendorBookingTicket,
  idx: number,
): BookingDetailsTicket {
  return {
    id: ticket.id ?? idx + 1,
    name: ticket.title,
    description: ticket.description,
    unit_price: ticket.price_per_ticket,
    quantity: ticket.quantity,
    total_amount: ticket.total,
  };
}

function mapLegacyPackage(
  drink: VendorBookingDrink,
  idx: number,
): BookingDetailsPackage {
  return {
    id: drink.id ?? idx + 1,
    name: drink.title,
    unit_price: drink.price,
    quantity: drink.quantity,
    total_amount: drink.total,
  };
}

function mapLegacyTableAllocations(
  table: VendorBookingTable,
  lineId: number,
): BookingTableAllocation[] | undefined {
  const normalized = normalizeTableAllocations(table.allocation);
  if (normalized.length > 0) {
    return normalized.map((entry, allocIdx) => {
      const numericId =
        Number.parseInt(entry.key, 10) || lineId * 100 + allocIdx + 1;
      const capacity = table.table_size;
      const occupied = entry.isAddedToExisting
        ? Math.max(0, capacity - 1)
        : Math.min(entry.seats, capacity);

      return {
        id: numericId,
        parent_id: entry.isAddedToExisting ? numericId : undefined,
        label: entry.tableLabel,
        table_number: allocIdx + 1,
        people: occupied,
        capacity,
      };
    });
  }

  if (table.no_tables > 0 && table.people > 0) {
    const perTable = Math.max(
      1,
      Math.floor(table.people / Math.max(1, table.no_tables)),
    );

    return Array.from({ length: table.no_tables }, (_, allocIdx) => ({
      id: lineId * 100 + allocIdx + 1,
      label: `Table ${allocIdx + 1}`,
      table_number: allocIdx + 1,
      people: Math.min(perTable, table.table_size),
      capacity: table.table_size,
    }));
  }

  return undefined;
}

function mapLegacyTable(
  table: VendorBookingTable,
  idx: number,
): BookingDetailsTable {
  const lineId = idx + 1;

  return {
    id: lineId,
    name: `Table of ${table.table_size}`,
    unit_price: table.price_per_person,
    quantity: table.people,
    total_amount: table.total,
    table_size: table.table_size,
    table_count: table.no_tables,
    allocations: mapLegacyTableAllocations(table, lineId),
  };
}

function mapLegacyEventDate(
  date: VendorBookingEventDate,
  packageTitleFallback?: string,
): VendorBookingDetailDate {
  return {
    booking_date_id: date.booking_date_id,
    event_date_id: 0,
    date_key: date.date_key,
    date_label: date.date,
    previous_date_label:
      typeof date.parent_booking_date === "string"
        ? date.parent_booking_date
        : date.parent_booking_date?.date ?? null,
    payment_status_label: date.payment_status,
    total_amount: date.total_amount,
    paid_amount: date.paid_amount,
    pending_amount: date.pending_payment,
    saved_amount: date.saved_amount,
    has_unbooked_event_dates: date.has_unbooked_event_dates,
    package_title: packageTitleFallback,
    tickets: (date.tickets ?? []).map(mapLegacyTicket),
    packages: (date.drinks ?? []).map(mapLegacyPackage),
    tables: (date.tables ?? []).map(mapLegacyTable),
    addons: {
      tables: [],
      tickets: [],
      packages: (date.addons?.drinks ?? []).map(mapLegacyPackage),
      total_amount: date.addons?.total_amount,
    },
  };
}

export function getVendorBookingDates(
  booking: VendorBookingDetail,
): VendorBookingDetailDate[] {
  const packageTitleFallback = booking.drink_title?.trim() || undefined;
  if (booking.dates?.length) return booking.dates;
  return (booking.event_dates ?? []).map((date) =>
    mapLegacyEventDate(date, packageTitleFallback),
  );
}

function mapDetailDate(
  date: VendorBookingDetailDate,
  formatCurrency: (value: number | string) => string,
  bookingIsMenuChoice?: boolean,
  isRoomSystem = false,
  packageTitleFallback?: string,
): VendorCheckoutDate {
  const totalAmount = parseAmount(date.total_amount);
  const paidAmount = parseAmount(date.paid_amount);
  const pendingFromApi =
    date.pending_amount != null ? parseAmount(date.pending_amount) : null;
  const pendingAmount =
    pendingFromApi != null && pendingFromApi > 0
      ? pendingFromApi
      : Math.max(totalAmount - paidAmount, 0) || null;

  const paymentStatusLabel = date.payment_status_label?.trim() || "Pending";
  const paymentStatusCode =
    date.payment_status_code ??
    resolvePaymentStatusCode({ payment_status_label: paymentStatusLabel });

  return {
    id: isRoomSystem
      ? buildCartDateLookupKey(date.date_key, date.room_id)
      : date.date_key,
    date_key: date.date_key,
    room_id: date.room_id ?? undefined,
    room_name: date.room_name ?? undefined,
    booking_date_id: date.booking_date_id,
    is_menu_choice: date.is_menu_choice ?? bookingIsMenuChoice,
    can_reschedule: date.can_reschedule === true,
    has_unbooked_event_dates: date.has_unbooked_event_dates === true,
    reschedule_initiated: date.reschedule_initiated === true,
    reschedule_block_reason: date.reschedule_block_reason,
    date: date.date_label,
    previous_date_label: date.previous_date_label ?? null,
    package_title: resolvePackageSectionTitle(date, packageTitleFallback),
    item_summary: date.item_summary,
    paymentStatus: normalizeVendorPaymentStatus(paymentStatusLabel),
    paymentStatusLabel,
    paymentStatusRaw: paymentStatusLabel,
    paymentStatusCode,
    vendorStatusOptions: date.vendor_status_options ?? [],
    addOnsPaymentStatus: normalizePaymentStatusForAddOnsDate(paymentStatusLabel),
    show_payment_mode_option: date.show_payment_mode_option === true,
    unpaid_addon_payment_mode: normalizeAddonPaymentMode(
      date.unpaid_addon_payment_mode,
    ),
    total: formatCurrency(totalAmount),
    totalAmount,
    savedAmount: parseSavedAmount(date.saved_amount),
    paidAmount,
    pendingAmount:
      pendingAmount != null && pendingAmount > 0 ? pendingAmount : null,
    tickets: date.tickets ?? [],
    packages: date.packages ?? [],
    tables: date.tables ?? [],
    addons: date.addons ?? {
      tables: [],
      tickets: [],
      packages: [],
      total_amount: 0,
    },
  };
}

export function mapVendorBookingToCheckout(
  booking: VendorBookingDetail,
  formatCurrency: (value: number | string) => string,
): MappedVendorBookingCheckout {
  const apiSummary = booking.payment_summary;
  const isRoomSystem = booking.is_room_system === true;

  const subTotal =
    parseAmount(apiSummary?.sub_total_amount) || parseAmount(booking.sub_total);
  const addOns =
    parseAmount(apiSummary?.total_addons_amount ?? apiSummary?.addons_amount) ||
    parseAmount(booking.addons_amount);
  const total =
    parseAmount(apiSummary?.total_amount) || parseAmount(booking.total);
  const paid =
    parseAmount(apiSummary?.total_paid_amount ?? apiSummary?.paid_amount) ||
    parseAmount(booking.paid_amount);

  const pendingFromSummary =
    apiSummary?.total_pending_amount ?? apiSummary?.pending_amount;
  const outstanding =
    pendingFromSummary != null
      ? parseAmount(pendingFromSummary)
      : booking.pending_payment != null
        ? parseAmount(booking.pending_payment)
        : Math.max(total - paid, 0);

  const bookingStatus =
    booking.status?.trim() ||
    booking.payment_status_label?.trim() ||
    booking.payment_status?.trim() ||
    "";

  const paymentStatus =
    booking.payment_status_label?.trim() ||
    booking.payment_status?.trim() ||
    "";

  const canPayNow = apiSummary?.can_pay_now !== false;

  const sourceDates = getVendorBookingDates(booking);
  const packageTitleFallback = booking.drink_title?.trim() || undefined;
  const dates = sourceDates.map((date) =>
    mapDetailDate(
      date,
      formatCurrency,
      booking.is_menu_choice,
      isRoomSystem,
      packageTitleFallback,
    ),
  );

  const addOnsTabDates: BookingDate[] = dates.map((date) => ({
    id: date.date_key ?? date.id,
    date: date.date,
    people:
      date.tables?.reduce((sum, table) => sum + (table.quantity ?? 0), 0) ?? 0,
    paymentStatus: date.addOnsPaymentStatus,
  }));

  const rescheduleInitiated =
    booking.reschedule_initiated === true ||
    dates.some((date) => date.reschedule_initiated === true);

  return {
    bookingNumber: booking.booking_number || String(booking.booking_id),
    eventName: booking.event_name,
    location: booking.location,
    bookingStatus,
    paymentStatus,
    canPayNow,
    isMenuChoice: booking.is_menu_choice ?? false,
    isRoomSystem,
    drinkTitle:
      sourceDates[0]?.package_title ?? booking.drink_title ?? undefined,
    rescheduleInitiated,
    summary: {
      subTotal,
      addOns,
      total,
      paid,
      outstanding,
      savedAmount: parseSavedAmount(apiSummary?.saved_amount),
      couponCode: parseCouponCode(apiSummary?.coupon_code),
    },
    dates,
    addOnsTabDates,
  };
}
