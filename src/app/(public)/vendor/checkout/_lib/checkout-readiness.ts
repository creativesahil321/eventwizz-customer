import type { EditableDateData } from "@/store/cart-edit.store";

export interface CheckoutDateReadiness {
  hasUnsavedEdits: boolean;
  hasValidationErrors: boolean;
  validationErrorMessage?: string;
}

type DateValidationResult = {
  isValid: boolean;
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
  showGatewayError: boolean;
}

export function resolveCheckoutCtaState(
  input: CheckoutCtaInput,
): CheckoutCtaState {
  const loading = input.isLoading;

  const showGatewayError =
    !input.hasSelectedGateway &&
    !input.hasValidationErrors &&
    !input.hasUnsavedEdits &&
    !loading;

  const disabled = input.hasPendingStripePayment
    ? loading
    : loading ||
      !input.hasPayableTotal ||
      input.hasValidationErrors ||
      !input.hasSelectedGateway;

  let label: string;
  if (input.hasPendingStripePayment && input.stripePaymentAmount != null) {
    label = `Complete payment · ${input.formatMoney(input.stripePaymentAmount)}`;
  } else if (loading) {
    label = "Processing...";
  } else if (!input.hasPayableTotal) {
    label = "Add items to continue";
  } else if (input.hasValidationErrors) {
    label = "Complete selections";
  } else if (!input.hasSelectedGateway) {
    label = "Select payment method";
  } else {
    label = `Pay ${input.formatMoney(input.finalTotalWithFee)} now`;
  }

  return { disabled, loading, label, showGatewayError };
}
