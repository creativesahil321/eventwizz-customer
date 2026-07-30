import type {
  AvailableRescheduleDate,
  RescheduleBookingPayload,
  RescheduleCurrentDate,
  RescheduleDataResponse,
  ReschedulePaymentGateway,
  RescheduleTableDetail,
} from "./type";

export function normalizeAvailableRescheduleDates(
  data?: RescheduleDataResponse["data"],
): AvailableRescheduleDate[] {
  if (!data) return [];
  return data.availableDates ?? data.available_dates ?? [];
}

type GatewayLike =
  | ReschedulePaymentGateway
  | { id: number; slug?: string; name?: string }
  | string;

function coercePaymentGateway(entry: GatewayLike): ReschedulePaymentGateway | null {
  if (typeof entry === "string") {
    const slug = entry.trim().toLowerCase();
    if (!slug) return null;
    return { id: slug === "stripe" ? 1 : 0, slug };
  }
  if (!entry || typeof entry !== "object" || !("id" in entry)) return null;
  const id = Number(entry.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const slug =
    ("slug" in entry && typeof entry.slug === "string" && entry.slug) ||
    ("name" in entry && typeof entry.name === "string" && entry.name) ||
    "stripe";
  return { id, slug: slug.toLowerCase() };
}

/** Same default as booking `pay` flow when show/reschedule omit gateway list. */
export const DEFAULT_STRIPE_PAYMENT_GATEWAY: ReschedulePaymentGateway = {
  id: 1,
  slug: "stripe",
};

/** Gateways from GET reschedule, booking show, then Stripe default. */
export function normalizeReschedulePaymentGateways(
  data?: RescheduleDataResponse["data"] | null,
  bookingFallback?: ReschedulePaymentGateway[] | null,
): ReschedulePaymentGateway[] {
  const raw =
    data?.payment_gateways ??
    (data as { paymentGateways?: GatewayLike[] } | null | undefined)
      ?.paymentGateways ??
    [];

  const fromReschedule = (Array.isArray(raw) ? raw : [])
    .map((entry) => coercePaymentGateway(entry))
    .filter((entry): entry is ReschedulePaymentGateway => entry != null);

  if (fromReschedule.length > 0) return fromReschedule;

  const fallback = (bookingFallback ?? [])
    .map((entry) => coercePaymentGateway(entry))
    .filter((entry): entry is ReschedulePaymentGateway => entry != null);

  if (fallback.length > 0) return fallback;

  return [DEFAULT_STRIPE_PAYMENT_GATEWAY];
}

export function resolveRescheduleDateKey(
  date: Pick<AvailableRescheduleDate, "date_key" | "dateKey">,
): string {
  return date.date_key ?? date.dateKey ?? "";
}

export function resolveRescheduleDateLabel(
  item: { date_label?: string; date?: string },
): string {
  return item.date_label?.trim() || item.date?.trim() || "—";
}

export function resolveRescheduleEventDateId(
  date: Pick<AvailableRescheduleDate, "event_date_id" | "id">,
): number {
  return date.event_date_id ?? date.id;
}

export function selectedRequiresPayment(
  date: Pick<AvailableRescheduleDate, "requires_payment" | "additional_payment_required" | "unpaid_amount" | "price">,
  currentPrice?: number,
  paidAmount?: number,
): boolean {
  if (date.requires_payment === true) return true;
  if (date.requires_payment === false) return false;

  if (date.additional_payment_required != null) {
    return date.additional_payment_required > 0;
  }
  if (date.unpaid_amount != null) {
    return date.unpaid_amount > 0;
  }
  // Prefer paid_amount as baseline — customer already paid this toward the booking
  const baseline = paidAmount ?? currentPrice;
  if (baseline != null) {
    return date.price > baseline;
  }
  return false;
}

export function getAdditionalPaymentRequired(
  date: Pick<
    AvailableRescheduleDate,
    "requires_payment" | "additional_payment_required" | "unpaid_amount" | "price"
  >,
  currentPrice?: number,
  paidAmount?: number,
): number {
  if (!selectedRequiresPayment(date, currentPrice, paidAmount)) return 0;

  if (date.additional_payment_required != null) {
    return Math.max(0, date.additional_payment_required);
  }
  if (date.unpaid_amount != null) {
    return Math.max(0, date.unpaid_amount);
  }
  const baseline = paidAmount ?? currentPrice;
  if (baseline != null && date.price > baseline) {
    return date.price - baseline;
  }
  return 0;
}

function mapTableDetailsForStore(
  tables: RescheduleTableDetail[],
): RescheduleBookingPayload["table_details"] {
  return tables.map((table) => ({
    event_date_table_id: table.event_date_table_id,
    allocated_seat: table.allocated_seat,
    table_size: table.table_size,
    price_per_person: table.price_per_person,
    total: table.total,
  }));
}

export function buildRescheduleStorePayload(input: {
  bookingId: number;
  bookingDateId: number;
  selected: AvailableRescheduleDate;
  current?: RescheduleCurrentDate | null;
  paymentGateways?: ReschedulePaymentGateway[];
  paymentGatewayId?: number | null;
}): RescheduleBookingPayload | null {
  const currentPrice = input.current
    ? Number.parseFloat(String(input.current.price))
    : undefined;
  const paidAmountRaw =
    input.current?.paid_amount != null
      ? Number.parseFloat(String(input.current.paid_amount))
      : undefined;
  const paidAmount = Number.isFinite(paidAmountRaw) ? paidAmountRaw : undefined;

  const requiresPayment = selectedRequiresPayment(
    input.selected,
    currentPrice,
    paidAmount,
  );
  const unpaidAmount = getAdditionalPaymentRequired(
    input.selected,
    currentPrice,
    paidAmount,
  );

  const gateways =
    (input.paymentGateways?.length ?? 0) > 0
      ? input.paymentGateways!
      : requiresPayment
        ? [DEFAULT_STRIPE_PAYMENT_GATEWAY]
        : [];

  const payload: RescheduleBookingPayload = {
    booking_id: input.bookingId,
    booking_date_id: input.bookingDateId,
    new_booking_date_id: resolveRescheduleEventDateId(input.selected),
    new_date: resolveRescheduleDateKey(input.selected),
    total_amount: input.selected.price,
    unpaid_amount: unpaidAmount,
    table_details: mapTableDetailsForStore(input.selected.table_details ?? []),
  };

  if (requiresPayment && unpaidAmount > 0) {
    const gatewayId =
      input.paymentGatewayId ??
      gateways[0]?.id ??
      DEFAULT_STRIPE_PAYMENT_GATEWAY.id;
    if (!gatewayId) return null;
    payload.payment_gateway = gatewayId;
  }

  return payload;
}

export function getReschedulePaymentRedirectUrl(
  response: { data?: { payment?: { redirect_url?: string } } },
): string | null {
  const url = response.data?.payment?.redirect_url;
  return url?.trim() ? url : null;
}
