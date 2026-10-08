/** Credentials for Stripe / PayPal manual connect */
export type PaymentGatewayCredentials = {
  key: string;
  secret: string;
};

export type PaymentGatewayConnectAccount = {
  id: number;
  account_status?: "pending" | "active" | "under_review" | "restricted";
  is_enabled?: boolean;
  /** Masked publishable / client key */
  key?: string;
  /** Masked secret */
  client_secret?: string;
  account_id?: string;
};

export type PaymentGatewayConnectVerification = {
  stripe_account_verified_at?: string | null;
  paypal_oauth_verified_at?: string | null;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  manual_webhook?: boolean;
  signing_key_generated?: boolean;
};

export type PaymentGatewayConnectData = {
  gateway: string;
  account?: PaymentGatewayConnectAccount;
  webhook_url?: string | null;
  manual_webhook?: boolean;
  webhook_setup_hint?: string | null;
  public_key?: string | null;
  verification?: PaymentGatewayConnectVerification;
  account_id?: string;
  connection_status?: string;
};

export type PaymentGatewayConnectResponse = {
  status: boolean;
  message: string;
  data?: PaymentGatewayConnectData;
  errors?: string[] | Record<string, string[]>;
};

export type PaymentGatewayName =
  | "stripe"
  | "paypal"
  | "worldpay"
  | "klarna"
  | "stripe_bank";

export function formatPaymentGatewayConnectErrors(
  errors?: string[] | Record<string, string[]>,
  fallback = "Failed to connect payment gateway",
): string {
  if (!errors) return fallback;
  if (Array.isArray(errors)) {
    return errors.filter(Boolean).join(", ") || fallback;
  }
  const messages = Object.values(errors).flat().filter(Boolean);
  return messages.length > 0 ? messages.join(", ") : fallback;
}

export function resolveConnectedAccountId(
  account?: PaymentGatewayConnectAccount,
): string {
  if (!account) return "";
  return (
    account.account_id ||
    account.key ||
    (account.id != null ? String(account.id) : "")
  );
}
