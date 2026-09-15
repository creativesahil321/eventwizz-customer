export const CUSTOMER_DELETE_CONFIRM_PHRASE = "delete this customer";
export const CUSTOMER_DELETE_OTP_LENGTH = 4;
export const CUSTOMER_DELETE_RESEND_SECONDS = 60;
export const CUSTOMER_DELETE_WARNING =
  "Soft-deleting a customer cannot be undone from the vendor panel. Soft-deleted customers cannot be restored. Continue only if you are sure.";

export function isSoftDeletedCustomersView(statusFilter?: string): boolean {
  return statusFilter === "delete";
}

export function shouldShowCustomerRowSelection(statusFilter?: string): boolean {
  return !isSoftDeletedCustomersView(statusFilter);
}

export function shouldShowCustomerRowActions(statusFilter?: string): boolean {
  return !isSoftDeletedCustomersView(statusFilter);
}

export function normalizeCustomerIds(ids: Array<number | string>): number[] {
  const unique = new Set<number>();
  for (const id of ids) {
    const numeric = Number(id);
    if (Number.isInteger(numeric) && numeric > 0) {
      unique.add(numeric);
    }
  }
  return [...unique].sort((a, b) => a - b);
}

export function isSingleCustomerDelete(ids: Array<number | string>): boolean {
  return normalizeCustomerIds(ids).length === 1;
}

export function buildSendDeleteOtpPayload(ids: Array<number | string>): {
  customer_ids: number[];
} {
  return { customer_ids: normalizeCustomerIds(ids) };
}

export function buildVerifyDeleteOtpPayload(
  ids: Array<number | string>,
  otp: string,
): {
  customer_ids: number[];
  otp: string;
} {
  return { customer_ids: normalizeCustomerIds(ids), otp };
}

export function buildBulkDeletePayload(
  ids: Array<number | string>,
  otp: string,
): {
  customer_ids: number[];
  otp: string;
  confirmation: string;
} {
  return {
    customer_ids: normalizeCustomerIds(ids),
    otp,
    confirmation: CUSTOMER_DELETE_CONFIRM_PHRASE,
  };
}

export function buildSingleDeletePayload(otp: string): {
  otp: string;
  confirmation: string;
} {
  return {
    otp,
    confirmation: CUSTOMER_DELETE_CONFIRM_PHRASE,
  };
}

export function isCustomerDeletePhraseReady(value: string): boolean {
  return value.trim().toLowerCase() === CUSTOMER_DELETE_CONFIRM_PHRASE;
}

export function getCustomerDeleteLabel(customer: {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const name = [customer.first_name, customer.last_name]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  if (name) return name;
  const email = customer.email?.trim();
  if (email) return email;
  return `Customer #${customer.id}`;
}

export function parseCustomerDeleteOtpResponse(response: unknown): {
  maskedEmail: string;
  resendAfter: number;
  customerCount?: number;
} {
  const data = (
    response as {
      data?: {
        masked_email?: string;
        resend_after?: number;
        expires_in?: number;
        customer_count?: number;
      };
    }
  )?.data;

  return {
    maskedEmail: data?.masked_email?.trim() || "the account owner's email",
    resendAfter:
      data?.resend_after ??
      data?.expires_in ??
      CUSTOMER_DELETE_RESEND_SECONDS,
    customerCount: data?.customer_count,
  };
}
