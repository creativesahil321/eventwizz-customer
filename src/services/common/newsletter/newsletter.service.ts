/**
 * Newsletter service — live Laravel API only.
 * Tenant is the X-Domain header (api client). Never send vendor_id.
 */

import axios, { type AxiosResponse } from "axios";
import { filenameFromContentDisposition } from "@/lib/export";
import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  ConfirmResult,
  ConfirmSubscriptionResult,
  CustomerSubscribeResult,
  ExportCsvParams,
  NewsletterCounts,
  NewsletterCsvFile,
  NewsletterSubscriber,
  NewsletterSubscribeResult,
  PublicUnsubscribeResult,
  SubscribePayload,
  SubscribeResult,
  SubscriberListParams,
  SubscriberListResult,
  SubscriberSource,
  SubscriberStatus,
  UnsubscribeInfo,
} from "./types";

const TOKEN_FULL = {
  returnFullResponse: true as const,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function newsletterApiMessage(
  error: unknown,
  fallback: string,
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
    if (error.response?.status === 429) {
      return "Please wait a moment and try again.";
    }
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function normalizeSubscribeResult(
  result: unknown,
  state: unknown,
  message: string,
): NewsletterSubscribeResult {
  if (
    result === "pending" ||
    result === "confirmation_pending" ||
    result === "subscribed" ||
    result === "already_subscribed"
  ) {
    return result;
  }
  const lower = message.toLowerCase();
  if (state === "pending") {
    if (
      lower.includes("already sent") ||
      lower.includes("already have a confirmation")
    ) {
      return "confirmation_pending";
    }
    return "pending";
  }
  if (lower.includes("already")) return "already_subscribed";
  return state === "subscribed" ? "subscribed" : "pending";
}

function subscribeFallbackMessage(result: NewsletterSubscribeResult): string {
  switch (result) {
    case "pending":
      return "Thank you. Please check your email to confirm your subscription.";
    case "confirmation_pending":
      return "We already sent a confirmation email. Check your inbox or spam folder.";
    case "already_subscribed":
      return "You are already subscribed.";
    default:
      return "Your newsletter subscription has been confirmed.";
  }
}

function parseSubscribeEnvelope(raw: unknown): SubscribeResult {
  const data = envelopeData<{ state?: unknown; result?: unknown }>(raw);
  const message = envelopeMessage(raw, "");
  const result = normalizeSubscribeResult(data?.result, data?.state, message);
  return {
    state:
      result === "subscribed" || result === "already_subscribed"
        ? "subscribed"
        : "pending",
    result,
    message: message || subscribeFallbackMessage(result),
  };
}

/** Laravel 422 `errors.email` (e.g. venue team address blocked). */
export function newsletterEmailFieldError(error: unknown): string | null {
  const payload = axios.isAxiosError(error) ? error.response?.data : error;
  if (!isRecord(payload)) return null;
  const errors = payload.errors;
  if (!isRecord(errors)) return null;
  const email = errors.email;
  if (Array.isArray(email)) {
    const first = email.find(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
    return first?.trim() ?? null;
  }
  if (typeof email === "string" && email.trim()) return email.trim();
  return null;
}

export function newsletterConfirmResult(error: unknown): ConfirmResult {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          data?: { result?: unknown };
          result?: unknown;
          message?: unknown;
        }
      | undefined;
    const result = data?.data?.result ?? data?.result;
    if (
      result === "expired" ||
      result === "invalid" ||
      result === "unsubscribed" ||
      result === "already_confirmed" ||
      result === "confirmed"
    ) {
      return result;
    }
    const message = typeof data?.message === "string" ? data.message.toLowerCase() : "";
    if (message.includes("expired")) return "expired";
    if (message.includes("unsubscribed")) return "unsubscribed";
  }
  return "invalid";
}

function normalizeStatus(raw: unknown): SubscriberStatus {
  if (raw === "pending" || raw === "unsubscribed" || raw === "subscribed") {
    return raw;
  }
  if (raw === "confirmed") return "subscribed";
  return "pending";
}

function normalizeSource(raw: unknown): SubscriberSource | null {
  if (raw === "landing" || raw === "public_form" || raw === "checkout") {
    return "landing";
  }
  if (raw === "dashboard" || raw === "vendor_admin") {
    return "dashboard";
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function subscriberPhone(row: NewsletterSubscriber): string | null {
  return row.phone ?? row.mobile;
}

function normalizeSubscriber(raw: unknown): NewsletterSubscriber | null {
  if (!isRecord(raw)) return null;
  const id = asNumber(raw.id);
  const email = asString(raw.email);
  if (id == null || !email) return null;

  const status = normalizeStatus(raw.status);
  return {
    id,
    name: asString(raw.name),
    email,
    mobile: asString(raw.mobile),
    phone: asString(raw.phone) ?? asString(raw.mobile),
    status,
    is_subscribed:
      typeof raw.is_subscribed === "boolean"
        ? raw.is_subscribed
        : status === "subscribed",
    user_type:
      raw.user_type === "guest" || raw.user_type === "customer"
        ? raw.user_type
        : null,
    source: normalizeSource(raw.source),
    location_id: asNumber(raw.location_id),
    customer_id: asNumber(raw.customer_id),
    opt_in_method: asString(raw.opt_in_method),
    verified_at: asString(raw.verified_at),
    confirmed_at: asString(raw.confirmed_at),
    unsubscribed_at: asString(raw.unsubscribed_at),
    last_exported_at: asString(raw.last_exported_at),
    exported_subscribed_at: asString(raw.exported_subscribed_at),
    exported_unsubscribed_at: asString(raw.exported_unsubscribed_at),
    created_at: asString(raw.created_at) ?? new Date().toISOString(),
  };
}

function emptyCounts(): NewsletterCounts {
  return {
    pending: 0,
    subscribed: 0,
    unsubscribed: 0,
    not_exported: 0,
    unsynced_unsubscribes: 0,
  };
}

function asCount(value: unknown): number {
  const n = asNumber(value);
  return n != null && n >= 0 ? n : 0;
}

export function normalizeCounts(raw: unknown): NewsletterCounts {
  if (!isRecord(raw)) return emptyCounts();
  const subscribed = asCount(raw.subscribed) || asCount(raw.confirmed);
  return {
    pending: asCount(raw.pending),
    subscribed,
    confirmed: subscribed,
    unsubscribed: asCount(raw.unsubscribed),
    not_exported: asCount(raw.not_exported),
    unsynced_unsubscribes: asCount(raw.unsynced_unsubscribes),
  };
}

function normalizeMeta(raw: unknown): SubscriberListResult["meta"] {
  if (!isRecord(raw)) {
    return { current_page: 1, per_page: 30, total: 0, last_page: 1 };
  }
  return {
    current_page: asCount(raw.current_page) || 1,
    per_page: asCount(raw.per_page) || 30,
    total: asCount(raw.total),
    last_page: asCount(raw.last_page) || 1,
  };
}

function parseListEnvelope(raw: unknown): SubscriberListResult {
  const envelope = isRecord(raw) ? raw : {};
  const inner = envelope.data;
  let rows: unknown[] = [];
  let meta = normalizeMeta(envelope.meta);
  let statsRaw: unknown = envelope.stats ?? envelope.counts;

  if (Array.isArray(inner)) {
    rows = inner;
  } else if (isRecord(inner)) {
    if (Array.isArray(inner.data)) rows = inner.data;
    else if (Array.isArray(inner.items)) rows = inner.items;
    if (inner.meta) meta = normalizeMeta(inner.meta);
    statsRaw = inner.stats ?? inner.counts ?? statsRaw;
  }

  return {
    data: rows
      .map(normalizeSubscriber)
      .filter((row): row is NewsletterSubscriber => row != null),
    stats: normalizeCounts(statsRaw),
    meta,
  };
}

function envelopeData<T>(raw: unknown): T | undefined {
  if (!isRecord(raw)) return undefined;
  return raw.data as T;
}

function envelopeMessage(raw: unknown, fallback: string): string {
  if (isRecord(raw) && typeof raw.message === "string" && raw.message.trim()) {
    return raw.message;
  }
  return fallback;
}

function errorFromExportJson(text: string): Error {
  try {
    const json = JSON.parse(text) as { message?: unknown };
    if (typeof json.message === "string" && json.message.trim()) {
      return new Error(json.message);
    }
  } catch {
    // not JSON
  }
  return new Error("Export failed.");
}

/** Save only Laravel CSV streams. JSON envelopes must not become a .csv file. */
async function assertCsvBlob(blob: Blob, contentType?: string): Promise<Blob> {
  const type = (contentType || blob.type || "").toLowerCase();
  const prefix = await blob.slice(0, 512).text();
  const trimmed = prefix.replace(/^\uFEFF/, "").trimStart();
  const isJson =
    type.includes("json") ||
    type.includes("application/problem") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");

  if (isJson) {
    const text = blob.size <= 512 ? prefix : await blob.text();
    throw errorFromExportJson(text);
  }

  const isCsv =
    type.includes("csv") ||
    trimmed.startsWith("Email Address") ||
    (trimmed.includes(",") && !trimmed.startsWith("<"));

  if (!isCsv) {
    throw new Error("Export failed.");
  }

  return blob;
}

export const newsletterService = {
  async listSubscribers(
    params: SubscriberListParams,
  ): Promise<SubscriberListResult> {
    const raw = await api.get<unknown>(API_ENDPOINTS.VENDOR.NEWSLETTER.GET_ALL, {
      params: {
        page: params.page,
        per_page: params.per_page,
        search: params.search || undefined,
        status: params.status ?? "all",
      },
      returnFullResponse: true,
    });
    return parseListEnvelope(raw);
  },

  async getCounts(): Promise<NewsletterCounts> {
    const raw = await api.get<NewsletterCounts | unknown>(
      API_ENDPOINTS.VENDOR.NEWSLETTER.COUNTS,
    );
    return normalizeCounts(raw);
  },

  async exportCsv(params: ExportCsvParams): Promise<NewsletterCsvFile> {
    const fallback =
      params.status === "subscribed" ? "subscribers.csv" : "unsubscribes.csv";
    try {
      const response = (await api.get(API_ENDPOINTS.VENDOR.NEWSLETTER.EXPORT, {
        params: {
          status: params.status,
          ...(params.scope ? { scope: params.scope } : {}),
        },
        responseType: "blob",
        headers: { Accept: "text/csv" },
        returnAxiosResponse: true,
      })) as AxiosResponse<Blob>;

      const blob = await assertCsvBlob(
        response.data,
        (response.headers?.["content-type"] as string | undefined),
      );
      return {
        blob,
        filename: filenameFromContentDisposition(
          response.headers?.["content-disposition"],
          fallback,
        ),
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        throw errorFromExportJson(await error.response.data.text());
      }
      throw error;
    }
  },

  async vendorUnsubscribe(id: number): Promise<void> {
    const url = API_ENDPOINTS.VENDOR.NEWSLETTER.UNSUBSCRIBE_BY_ID.replace(
      "{id}",
      String(id),
    );
    await api.post(url, {}, { returnFullResponse: true });
  },

  async subscribe(payload: SubscribePayload): Promise<SubscribeResult> {
    const raw = await api.post<
      ApiResponse<{ state?: SubscriberStatus; result?: NewsletterSubscribeResult }>
    >(
      API_ENDPOINTS.PUBLIC.SUBSCRIBE,
      { ...payload, source: "landing" },
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
        suppressErrorToast: true,
      },
    );
    return parseSubscribeEnvelope(raw);
  },

  async resendConfirmation(payload: SubscribePayload): Promise<SubscribeResult> {
    const raw = await api.post<
      ApiResponse<{ state?: SubscriberStatus; result?: NewsletterSubscribeResult }>
    >(
      API_ENDPOINTS.PUBLIC.SUBSCRIBE_RESEND,
      { ...payload, source: "landing" },
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
        suppressErrorToast: true,
      },
    );
    return parseSubscribeEnvelope(raw);
  },

  async confirmSubscription(token: string): Promise<ConfirmSubscriptionResult> {
    const raw = await api.post<
      ApiResponse<{ result?: ConfirmResult; state?: SubscriberStatus }>
    >(
      API_ENDPOINTS.PUBLIC.SUBSCRIBE_VERIFY,
      { token },
      TOKEN_FULL,
    );
    const data = envelopeData<{ result?: ConfirmResult; state?: SubscriberStatus }>(
      raw,
    );
    const result: ConfirmResult =
      data?.result === "already_confirmed" ? "already_confirmed" : "confirmed";
    return {
      result,
      state: data?.state === "subscribed" ? "subscribed" : undefined,
      message: envelopeMessage(
        raw,
        "Your newsletter subscription has been confirmed.",
      ),
    };
  },

  async getUnsubscribeInfo(token: string): Promise<UnsubscribeInfo> {
    const data = await api.get<UnsubscribeInfo>(
      API_ENDPOINTS.PUBLIC.NEWSLETTER_UNSUBSCRIBE,
      { params: { token } },
    );
    return {
      email: data.email,
      vendor_name: data.vendor_name,
      status: normalizeStatus(data.status),
    };
  },

  async unsubscribeByToken(token: string): Promise<PublicUnsubscribeResult> {
    const raw = await api.post<
      ApiResponse<{ result?: string; status?: SubscriberStatus }>
    >(
      API_ENDPOINTS.PUBLIC.NEWSLETTER_UNSUBSCRIBE,
      { token },
      TOKEN_FULL,
    );
    return {
      result: "unsubscribed",
      status: "unsubscribed",
      message: envelopeMessage(raw, "You have been unsubscribed."),
    };
  },

  async customerSubscribe(payload?: {
    name?: string;
    phone?: string;
    location_id?: number;
  }): Promise<CustomerSubscribeResult> {
    const raw = await api.post<
      ApiResponse<{ state?: SubscriberStatus; result?: NewsletterSubscribeResult }>
    >(
      API_ENDPOINTS.CUSTOMER.NEWSLETTER.SUBSCRIBE,
      { ...payload, source: "dashboard" },
      { returnFullResponse: true, suppressSuccessToast: true },
    );
    return parseSubscribeEnvelope(raw);
  },

  async customerUnsubscribe(): Promise<{ message: string }> {
    const raw = await api.post<ApiResponse<unknown>>(
      API_ENDPOINTS.CUSTOMER.NEWSLETTER.UNSUBSCRIBE,
      {},
      { returnFullResponse: true },
    );
    return {
      message: envelopeMessage(raw, "You have been unsubscribed."),
    };
  },
};

/**
 * Whether the authenticated customer is subscribed to the current tenant's
 * newsletter. Lightweight replacement for reading is_newsletter_subscribed
 * from the full /theme/settings payload.
 * Backend contract: docs/backend-contracts/newsletter-status-api.md
 */
export async function getCustomerNewsletterStatus(): Promise<boolean> {
  const raw = await api.get<{ subscribed?: boolean; data?: { subscribed?: boolean } }>(
    API_ENDPOINTS.CUSTOMER.NEWSLETTER.STATUS,
  );
  // Tolerate both unwrapped ({subscribed}) and enveloped ({data:{subscribed}}).
  return raw?.subscribed === true || raw?.data?.subscribed === true;
}
