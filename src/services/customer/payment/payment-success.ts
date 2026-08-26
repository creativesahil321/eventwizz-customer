import axios from "axios";
import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";

const SILENT_REQUEST = {
  returnFullResponse: true as const,
  suppressErrorToast: true,
  suppressSuccessToast: true,
};

export interface PaymentSuccessReceipt {
  booking_id: number;
  booking_number: string;
  is_paid: boolean;
  amount: number;
  currency?: string;
  gateway: string;
  transaction_id?: string;
  event_name?: string;
  event_date?: string;
  event_location?: string;
  guest_count?: number;
}

type PaymentSuccessReceiptResponse = {
  status: boolean;
  message?: string;
  data?: PaymentSuccessReceipt;
};

export type PaymentSuccessReceiptResult =
  | { kind: "paid"; data: PaymentSuccessReceipt }
  | { kind: "pending" }
  | { kind: "not_found" }
  | { kind: "unauthorized" }
  | { kind: "error" };

const stripeConfirmAttempted = new Set<string>();

function getAxiosStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}

function isPaidFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function toReceipt(data: PaymentSuccessReceipt): PaymentSuccessReceipt {
  return {
    booking_id: Number(data.booking_id),
    booking_number: String(data.booking_number ?? ""),
    is_paid: isPaidFlag(data.is_paid),
    amount: Number(data.amount),
    currency: data.currency,
    gateway: String(data.gateway ?? ""),
    transaction_id: data.transaction_id ? String(data.transaction_id) : undefined,
    event_name: data.event_name,
    event_date: data.event_date,
    event_location: data.event_location,
    guest_count:
      data.guest_count == null ? undefined : Number(data.guest_count),
  };
}

export async function fetchPaymentSuccessReceipt(
  bookingNumber: string,
): Promise<PaymentSuccessReceiptResult> {
  try {
    const response = await api.get<PaymentSuccessReceiptResponse>(
      API_ENDPOINTS.CUSTOMER.PAYMENT.SUCCESS,
      {
        ...SILENT_REQUEST,
        params: { booking_number: bookingNumber },
      },
    );

    if (
      response.status === true &&
      response.data &&
      isPaidFlag(response.data.is_paid)
    ) {
      const receipt = toReceipt(response.data);
      if (receipt.booking_number) {
        return { kind: "paid", data: receipt };
      }
    }

    return { kind: "pending" };
  } catch (error) {
    const status = getAxiosStatus(error);
    if (status === 401) return { kind: "unauthorized" };
    if (status === 404 || status === 403) return { kind: "not_found" };
    if (status === 422) return { kind: "pending" };
    return { kind: "error" };
  }
}

/**
 * Optional webhook backup on first landing. Never used as the confirmation card source.
 * Failures are ignored so GET receipt remains the source of truth.
 */
export async function confirmStripePaymentBackup(params: {
  bookingId?: number;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  sessionId?: string | null;
}): Promise<string | undefined> {
  const key =
    params.sessionId ||
    params.checkoutSessionId ||
    params.paymentIntentId ||
    (params.bookingId != null ? `booking:${params.bookingId}` : null);

  if (!key || stripeConfirmAttempted.has(key)) return undefined;
  stripeConfirmAttempted.add(key);

  try {
    if (params.sessionId) {
      const response = await api.post<PaymentSuccessReceiptResponse>(
        API_ENDPOINTS.CUSTOMER.PAYMENT.STRIPE_SUCCESS,
        { session_id: params.sessionId },
        SILENT_REQUEST,
      );
      return response.data?.booking_number;
    }

    if (params.bookingId && params.checkoutSessionId) {
      await api.post(
        API_ENDPOINTS.CUSTOMER.PAYMENT.STRIPE_SUCCESS,
        {
          booking_id: params.bookingId,
          checkout_session_id: params.checkoutSessionId,
        },
        SILENT_REQUEST,
      );
      return undefined;
    }

    if (params.bookingId && params.paymentIntentId) {
      await api.post(
        API_ENDPOINTS.CUSTOMER.PAYMENT.STRIPE_SUCCESS,
        {
          booking_id: params.bookingId,
          payment_intent_id: params.paymentIntentId,
        },
        SILENT_REQUEST,
      );
    }
  } catch {
    // Webhook may still complete; the GET receipt decides the UI.
  }

  return undefined;
}
