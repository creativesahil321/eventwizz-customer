import type { EditableDateData } from "@/store/cart-edit.store";
import { buildDateSelectionSummary } from "./cart-calculations";

export const CHECKOUT_EMPTY_DATE_SUMMARY = "No items selected yet";

export interface CheckoutDateCounts {
  total: number;
  ready: number;
  needsItems: number;
}

type CheckoutDateDataGetter = (
  eventSlug: string,
  date: string,
) => EditableDateData | null | undefined;

export function isCheckoutDateEmpty(
  dateData: Parameters<typeof buildDateSelectionSummary>[0],
): boolean {
  return buildDateSelectionSummary(dateData) === CHECKOUT_EMPTY_DATE_SUMMARY;
}

export function countCheckoutDateStatuses(
  eventSlug: string | null | undefined,
  availableDates: string[],
  getDateData: CheckoutDateDataGetter,
): CheckoutDateCounts {
  if (!eventSlug) {
    return { total: 0, ready: 0, needsItems: 0 };
  }

  let ready = 0;
  let needsItems = 0;

  for (const date of availableDates) {
    const dateData = getDateData(eventSlug, date);
    if (!dateData) continue;

    if (isCheckoutDateEmpty(dateData)) {
      needsItems += 1;
    } else {
      ready += 1;
    }
  }

  return { total: ready + needsItems, ready, needsItems };
}

export function findFirstIncompleteCheckoutDate(
  eventSlug: string | null | undefined,
  availableDates: string[],
  getDateData: CheckoutDateDataGetter,
): string | null {
  if (!eventSlug) return null;

  for (const date of availableDates) {
    const dateData = getDateData(eventSlug, date);
    if (!dateData) continue;
    if (isCheckoutDateEmpty(dateData)) return date;
  }

  return null;
}

function formatDateReadinessPart(counts: CheckoutDateCounts): string {
  const { total, ready, needsItems } = counts;
  if (total === 0) return "0 dates";
  if (needsItems === 0) {
    return `${total} date${total !== 1 ? "s" : ""} ready`;
  }
  // Plain language for the booking header + mobile total bar
  // (was "1 date need items" / "1 date ready · 1 need items").
  if (ready === 0) {
    return total === 1 ? "No items added yet" : `${total} dates · no items yet`;
  }
  return `${ready} of ${total} dates ready`;
}

export interface CheckoutPurchaseCounts {
  tickets: number;
  tables: number;
}

type PurchaseCountSource = {
  tickets: Array<{ quantity: number }>;
  tables: Array<{ quantity: number }>;
};

/** What was actually bought on a date — tickets and tables are separate purchases. */
export function countDatePurchases(
  dateData: PurchaseCountSource | null | undefined,
): CheckoutPurchaseCounts {
  if (!dateData) return { tickets: 0, tables: 0 };
  const sum = (items: Array<{ quantity: number }>) =>
    items.reduce((total, item) => total + Math.max(0, item.quantity || 0), 0);
  return { tickets: sum(dateData.tickets), tables: sum(dateData.tables) };
}

export function sumPurchaseCounts(
  counts: CheckoutPurchaseCounts[],
): CheckoutPurchaseCounts {
  return counts.reduce(
    (total, c) => ({
      tickets: total.tickets + c.tickets,
      tables: total.tables + c.tables,
    }),
    { tickets: 0, tables: 0 },
  );
}

function formatPurchasePart(counts?: CheckoutPurchaseCounts): string {
  if (!counts) return "";
  const parts: string[] = [];
  if (counts.tickets > 0) {
    parts.push(`${counts.tickets} ticket${counts.tickets !== 1 ? "s" : ""}`);
  }
  if (counts.tables > 0) {
    parts.push(`${counts.tables} table${counts.tables !== 1 ? "s" : ""}`);
  }
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}

/**
 * Booking header / mobile total bar, e.g. "2 rooms · 2 dates ready · 4 tickets · 1 table".
 * Shows what was bought rather than a single "guests" total: tickets and table
 * seats are separate purchases, so summing them (or showing only table guests)
 * never matched what the customer paid for.
 */
export function formatCheckoutBookingMetaLine(params: {
  roomMode: boolean;
  roomCount: number;
  dateCounts: CheckoutDateCounts;
  purchaseCounts?: CheckoutPurchaseCounts;
}): string {
  const { roomMode, roomCount, dateCounts, purchaseCounts } = params;
  const purchaseSuffix = formatPurchasePart(purchaseCounts);
  const datePart = formatDateReadinessPart(dateCounts);

  if (roomMode && roomCount > 0) {
    return `${roomCount} room${roomCount !== 1 ? "s" : ""} · ${datePart}${purchaseSuffix}`;
  }

  return `${datePart}${purchaseSuffix}`;
}

export interface CheckoutDateReadiness {
  hasUnsavedEdits: boolean;
  hasValidationErrors: boolean;
  validationErrorMessage?: string;
}

type DateValidationResult = {
  isValid: boolean;
  hasTableOrTicket?: boolean;
  errorMessage?: string;
};

export interface AssessCheckoutDatesInput {
  eventSlug: string | null | undefined;
  availableDates: string[];
  getDateData: (
    eventSlug: string,
    date: string,
  ) => EditableDateData | null | undefined;
  hasUnsavedChanges: (eventSlug: string, date: string) => boolean;
  validateDateRequirements: (
    eventSlug: string,
    date: string,
  ) => DateValidationResult;
}

export function assessCheckoutDatesReadiness(
  input: AssessCheckoutDatesInput,
): CheckoutDateReadiness {
  const { eventSlug, availableDates } = input;

  if (!eventSlug) {
    return { hasUnsavedEdits: false, hasValidationErrors: false };
  }

  let hasUnsavedEdits = false;
  let hasValidationErrors = false;
  let validationErrorMessage: string | undefined;

  for (const date of availableDates) {
    const dateData = input.getDateData(eventSlug, date);
    if (!dateData) continue;

    if (input.hasUnsavedChanges(eventSlug, date)) {
      hasUnsavedEdits = true;
    }

    const validation = input.validateDateRequirements(eventSlug, date);
    if (!validation.isValid) {
      hasValidationErrors = true;
      validationErrorMessage ??= validation.errorMessage;
      continue;
    }

    // Empty dates in the cart are incomplete — don't push payment until
    // every cart date has at least one table or ticket.
    if (!validation.hasTableOrTicket) {
      hasValidationErrors = true;
      validationErrorMessage ??=
        "Add tables or tickets for each date before paying";
    }
  }

  return { hasUnsavedEdits, hasValidationErrors, validationErrorMessage };
}

export interface CheckoutCtaInput {
  isLoading: boolean;
  hasPendingStripePayment: boolean;
  stripePaymentAmount: number | null;
  hasPayableTotal: boolean;
  hasValidationErrors: boolean;
  hasUnsavedEdits: boolean;
  hasSelectedGateway: boolean;
  finalTotalWithFee: number;
  formatMoney: (amount: number) => string;
}

export interface CheckoutCtaState {
  disabled: boolean;
  loading: boolean;
  label: string;
  /** Shorter label for narrow sticky footers (avoids truncation). */
  mobileLabel: string;
  showGatewayError: boolean;
  /**
   * Cart is ready except gateway — CTA stays enabled and should open/focus
   * the payment-method picker instead of starting checkout.
   */
  needsGatewaySelection: boolean;
}

export function resolveCheckoutCtaState(
  input: CheckoutCtaInput,
): CheckoutCtaState {
  const loading = input.isLoading;

  const needsGatewaySelection =
    !input.hasSelectedGateway &&
    input.hasPayableTotal &&
    !input.hasValidationErrors &&
    !input.hasPendingStripePayment &&
    !loading;

  const showGatewayError =
    needsGatewaySelection && !input.hasUnsavedEdits;

  // Missing gateway must NOT disable the CTA — on mobile the picker lives in
  // the summary drawer, and a greyed "Select payment method" looks broken.
  const disabled = input.hasPendingStripePayment
    ? loading
    : loading || !input.hasPayableTotal || input.hasValidationErrors;

  let label: string;
  let mobileLabel: string;
  if (input.hasPendingStripePayment && input.stripePaymentAmount != null) {
    label = `Complete payment · ${input.formatMoney(input.stripePaymentAmount)}`;
    // Keep amount; layout stacks full-width on mobile so this won't truncate.
    // Amount already shown in the sticky total row — keep the CTA short on phones.
    mobileLabel = "Complete payment";
  } else if (loading) {
    label = "Processing...";
    mobileLabel = "Processing...";
  } else if (!input.hasPayableTotal) {
    label = "Add items to continue";
    mobileLabel = "Add items";
  } else if (input.hasValidationErrors) {
    label = "Complete selections";
    mobileLabel = "Complete selections";
  } else {
    // Keep "Pay $X" even before a gateway is chosen — tapping Pay opens the
    // picker instead of starting checkout (needsGatewaySelection).
    label = `Pay ${input.formatMoney(input.finalTotalWithFee)} now`;
    mobileLabel = `Pay ${input.formatMoney(input.finalTotalWithFee)}`;
  }

  return {
    disabled,
    loading,
    label,
    mobileLabel,
    showGatewayError,
    needsGatewaySelection,
  };
}
