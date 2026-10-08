import axios from "axios";
import { toast } from "sonner";

/** API slug. Never render this string in Bank Transfer UI. */
export const BANK_TRANSFER_GATEWAY = "stripe_bank" as const;

export type BankTransferConnectScope = "onboarding" | "settings";

export type BankTransferConnectInput = {
  scope: BankTransferConnectScope;
  sourceAccountId?: number;
  replaceId?: number;
  credentials?: {
    publishableKey: string;
    secret: string;
  };
};

export type BankTransferFieldErrors = {
  secret?: string;
  sourceAccountId?: string;
  paymentGateway?: string;
  credentials?: string;
};

export type BankTransferConnectResult = {
  status: boolean;
  message: string;
  httpStatus?: number;
  fieldErrors: BankTransferFieldErrors;
  account?: {
    id: number;
    is_enabled?: boolean;
    key?: string;
    client_secret?: string;
    account_id?: string;
  };
};

export type BankTransferOnboardingOffer = {
  id?: number | null;
  online_account_id?: number | null;
  key?: string;
  secret?: string;
};

function firstMessage(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = firstMessage(entry);
      if (message) return message;
    }
  }
  return undefined;
}

export function flattenErrorMessages(errors: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (value: unknown, prefix: string) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, nested] of Object.entries(
        value as Record<string, unknown>,
      )) {
        walk(nested, prefix ? `${prefix}.${key}` : key);
      }
      return;
    }
    const message = firstMessage(value);
    if (message && prefix) out[prefix] = message;
  };
  walk(errors, "");
  return out;
}

export function bankTransferFieldErrors(
  errors: unknown,
): BankTransferFieldErrors {
  const flat = flattenErrorMessages(errors);
  return {
    secret: flat["credentials.secret"],
    sourceAccountId: flat.source_account_id,
    paymentGateway: flat.payment_gateway,
    credentials: flat.credentials,
  };
}

export function buildBankTransferConnectBody(
  input: BankTransferConnectInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    payment_gateway: BANK_TRANSFER_GATEWAY,
  };
  const publishableKey = input.credentials?.publishableKey.trim() ?? "";
  const secret = input.credentials?.secret.trim() ?? "";
  const hasCredentials = publishableKey.length > 0 || secret.length > 0;

  if (input.sourceAccountId != null && !hasCredentials) {
    body.source_account_id = input.sourceAccountId;
  } else if (hasCredentials) {
    body.credentials = {
      publishable_key: publishableKey,
      secret,
    };
  }

  if (input.scope === "settings" && input.replaceId != null) {
    body.replace_id = input.replaceId;
  }

  return body;
}

export function readBankTransferFailure(error: unknown): {
  message: string;
  httpStatus?: number;
  fieldErrors: BankTransferFieldErrors;
} {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: unknown; errors?: unknown }
      | undefined;
    const message = firstMessage(data?.message) ?? "";
    const httpStatus = error.response?.status;
    if (httpStatus === 429 && message) toast.error(message);
    return {
      message,
      httpStatus,
      fieldErrors: bankTransferFieldErrors(data?.errors),
    };
  }

  if (error && typeof error === "object") {
    const data = error as { message?: unknown; errors?: unknown };
    return {
      message: firstMessage(data.message) ?? "",
      fieldErrors: bankTransferFieldErrors(data.errors),
    };
  }

  return { message: "", fieldErrors: {} };
}
