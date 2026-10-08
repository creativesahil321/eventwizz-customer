/**
 * Persistence GET returns payment gateways nested as:
 *   { online: { stripe, paypal, ... }, offline: [] }
 * with credential fields (`key` / `secret` / `setup_status`).
 *
 * The step-10 form expects a flat shape:
 *   { stripe: { status, account_id }, paypal: {...} }
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
  webhook_url?: string;
  public_key?: string;
};

export type OnboardingPaymentGatewaysUi = {
  stripe?: OnboardingGatewayUi;
  paypal?: OnboardingGatewayUi;
  worldpay?: OnboardingGatewayUi;
  klarna?: OnboardingGatewayUi;
};

export type BankTransferOnboardingOffer = {
  id?: number | null;
  online_account_id?: number | null;
  key?: string;
  secret?: string;
};

function optionalId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readBankTransferOffer(
  paymentGateways: unknown,
): BankTransferOnboardingOffer | undefined {
  if (!isRecord(paymentGateways) || !("bank_transfer" in paymentGateways)) {
    return undefined;
  }
  const raw = paymentGateways.bank_transfer;
  if (!isRecord(raw)) return { id: null, online_account_id: null };
  return {
    id: optionalId(raw.id),
    online_account_id: optionalId(raw.online_account_id),
    ...(nonEmptyString(raw.key) ? { key: nonEmptyString(raw.key) } : {}),
    ...(nonEmptyString(raw.secret) ? { secret: nonEmptyString(raw.secret) } : {}),
  };
}

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
    nonEmptyString(raw.account_id) || nonEmptyString(raw.key) || "";

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
  const nested = Boolean(online || Array.isArray(raw.offline));

  const pick = (name: keyof OnboardingPaymentGatewaysUi) => {
    if (nested) return online?.[name] ?? raw[name];
    return raw[name];
  };

  return {
    stripe: mapApiGatewayEntry(pick("stripe")),
    paypal: mapApiGatewayEntry(pick("paypal")),
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
  const bankTransfer = readBankTransferOffer(stepTen.payment_gateways);

  let acceptPaymentMethod = stepTen.accept_payment_method;
  if (
    acceptPaymentMethod !== "bank_transfer" &&
    acceptPaymentMethod !== "payment_gateway" &&
    acceptPaymentMethod !== "both"
  ) {
    acceptPaymentMethod = "payment_gateway";
  }

  return {
    ...stepTen,
    payment_gateways: paymentGateways,
    accept_payment_method: acceptPaymentMethod,
    bank_transfer: bankTransfer,
  };
}
