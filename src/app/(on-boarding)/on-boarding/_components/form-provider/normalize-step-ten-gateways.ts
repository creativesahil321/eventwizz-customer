/**
 * Persistence GET returns payment gateways nested as:
 *   { online: { stripe, paypal, ... }, offline: { truelayer } }
 * with credential fields (`key` / `secret` / `setup_status`).
 *
 * The step-10 form expects a flat shape:
 *   { stripe: { status, account_id }, paypal: {...}, truelayer: {...} }
 */

export type OnboardingGatewayStatus =
  | "pending"
  | "active"
  | "under_review"
  | "restricted"
  | undefined;

export type OnboardingGatewayUi = {
  status?: OnboardingGatewayStatus;
  account_id?: string;
  bank?: {
    bank_name?: string;
    account_masked?: string;
  };
  /** Preserved for TrueLayer connected UI (not required for connect gating). */
  webhook_url?: string;
  public_key?: string;
};

export type OnboardingPaymentGatewaysUi = {
  stripe?: OnboardingGatewayUi;
  paypal?: OnboardingGatewayUi;
  truelayer?: OnboardingGatewayUi;
  worldpay?: OnboardingGatewayUi;
  klarna?: OnboardingGatewayUi;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function credentialPresent(value: unknown): boolean {
  return Boolean(nonEmptyString(value));
}

function coerceGatewayStatus(value: unknown): OnboardingGatewayStatus {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return "active";
  }
  if (typeof value !== "string") return undefined;
  const s = value.trim().toLowerCase();
  if (
    s === "pending" ||
    s === "active" ||
    s === "under_review" ||
    s === "restricted"
  ) {
    return s;
  }
  if (s === "connected" || s === "ready" || s === "enabled") {
    return "active";
  }
  return undefined;
}

function mapApiGatewayEntry(raw: unknown): OnboardingGatewayUi {
  if (!isRecord(raw)) {
    return { status: undefined, account_id: "" };
  }

  const setupStatus =
    typeof raw.setup_status === "string"
      ? raw.setup_status.trim().toLowerCase()
      : "";

  const explicitStatus = coerceGatewayStatus(raw.status ?? raw.account_status);

  const hasCredentials =
    credentialPresent(raw.key) ||
    credentialPresent(raw.secret) ||
    credentialPresent(raw.client_secret) ||
    credentialPresent(raw.merchant_account_id) ||
    credentialPresent(raw.account_id);

  let status: OnboardingGatewayStatus = explicitStatus;

  if (
    setupStatus === "not_connected" ||
    setupStatus === "disconnected" ||
    setupStatus === "inactive"
  ) {
    status = undefined;
  } else if (!status) {
    if (
      setupStatus === "connected" ||
      setupStatus === "ready" ||
      raw.is_ready_for_bank_pay === true ||
      hasCredentials
    ) {
      status = "active";
    } else if (
      setupStatus === "pending" ||
      setupStatus === "under_review" ||
      setupStatus === "restricted"
    ) {
      status = setupStatus;
    }
  }

  const accountId =
    nonEmptyString(raw.account_id) ||
    nonEmptyString(raw.merchant_account_id) ||
    nonEmptyString(raw.key) ||
    "";

  const bank = isRecord(raw.bank)
    ? {
        bank_name: nonEmptyString(raw.bank.bank_name),
        account_masked: nonEmptyString(raw.bank.account_masked),
      }
    : undefined;

  return {
    status,
    account_id: accountId,
    ...(bank ? { bank } : {}),
    ...(nonEmptyString(raw.webhook_url)
      ? { webhook_url: nonEmptyString(raw.webhook_url) }
      : {}),
    ...(nonEmptyString(raw.public_key)
      ? { public_key: nonEmptyString(raw.public_key) }
      : {}),
  };
}

const EMPTY_GATEWAYS: OnboardingPaymentGatewaysUi = {
  stripe: { status: undefined, account_id: "" },
  paypal: { status: undefined, account_id: "" },
  truelayer: {
    status: undefined,
    account_id: "",
    bank: { bank_name: undefined, account_masked: undefined },
  },
  worldpay: { status: undefined, account_id: "" },
  klarna: { status: undefined, account_id: "" },
};

/**
 * Normalize persistence `payment_gateways` (nested online/offline or flat) into
 * the step-10 UI shape.
 */
export function normalizeStepTenPaymentGatewaysFromApi(
  raw: unknown,
): OnboardingPaymentGatewaysUi {
  if (!isRecord(raw)) {
    return { ...EMPTY_GATEWAYS };
  }

  const online = isRecord(raw.online) ? raw.online : null;
  const offline = isRecord(raw.offline) ? raw.offline : null;
  const nested = Boolean(online || offline);

  const pick = (name: keyof OnboardingPaymentGatewaysUi) => {
    if (nested) {
      if (name === "truelayer") {
        return offline?.truelayer ?? raw.truelayer;
      }
      return online?.[name] ?? raw[name];
    }
    return raw[name];
  };

  return {
    stripe: mapApiGatewayEntry(pick("stripe")),
    paypal: mapApiGatewayEntry(pick("paypal")),
    truelayer: mapApiGatewayEntry(pick("truelayer")),
    worldpay: mapApiGatewayEntry(pick("worldpay")),
    klarna: mapApiGatewayEntry(pick("klarna")),
  };
}

/** Normalize full `stepTen` block from persistence GET. */
export function normalizeStepTenFromApi(
  stepTen: unknown,
): Record<string, unknown> | undefined {
  if (!isRecord(stepTen)) return undefined;

  const paymentGateways = normalizeStepTenPaymentGatewaysFromApi(
    stepTen.payment_gateways,
  );

  const hasBank = paymentGateways.truelayer?.status === "active";
  const hasCard =
    paymentGateways.stripe?.status === "active" ||
    paymentGateways.paypal?.status === "active" ||
    paymentGateways.worldpay?.status === "active" ||
    paymentGateways.klarna?.status === "active";

  let acceptPaymentMethod = stepTen.accept_payment_method;
  if (
    acceptPaymentMethod !== "bank_transfer" &&
    acceptPaymentMethod !== "payment_gateway" &&
    acceptPaymentMethod !== "both"
  ) {
    if (hasBank && hasCard) acceptPaymentMethod = "both";
    else if (hasBank) acceptPaymentMethod = "bank_transfer";
    else acceptPaymentMethod = "payment_gateway";
  }

  return {
    ...stepTen,
    payment_gateways: paymentGateways,
    accept_payment_method: acceptPaymentMethod,
  };
}
