import type { EditableDateData } from "@/store/cart-edit.store";

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
