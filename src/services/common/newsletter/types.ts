/**
 * Newsletter consent list — EventWizz is the source of truth.
 * Vendors export CSVs and import them into Mailchimp by hand.
 * Matches the Laravel DTOs. Never send vendor_id; tenant is X-Domain.
 */

export type SubscriberStatus = "pending" | "subscribed" | "unsubscribed";

export type SubscriberSource = "landing" | "dashboard";

export type SubscriberUserType = "guest" | "customer";

export interface NewsletterSubscriber {
  id: number;
  name: string | null;
  email: string;
  mobile: string | null;
  phone: string | null;
  status: SubscriberStatus;
  is_subscribed: boolean;
  user_type: SubscriberUserType | null;
  source: SubscriberSource | null;
  location_id: number | null;
  customer_id: number | null;
  opt_in_method: string | null;
  verified_at: string | null;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  last_exported_at: string | null;
  exported_subscribed_at: string | null;
  exported_unsubscribed_at: string | null;
  created_at: string;
}

export interface NewsletterCounts {
  pending: number;
  subscribed: number;
  /** Alias of subscribed — ignore in UI, use subscribed. */
  confirmed?: number;
  unsubscribed: number;
  /** Subscribed rows never exported. */
  not_exported: number;
  /** Unsubscribed rows never exported to unsubscribes.csv. */
  unsynced_unsubscribes: number;
}

export type SubscriberStatusFilter = SubscriberStatus | "all";

export interface SubscriberListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: SubscriberStatusFilter;
}

export interface SubscriberListResult {
  data: NewsletterSubscriber[];
  stats: NewsletterCounts;
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export type ExportStatus = Extract<SubscriberStatus, "subscribed" | "unsubscribed">;

export interface ExportCsvParams {
  status: ExportStatus;
  /** Only rows not yet exported. */
  scope?: "new";
}

export interface NewsletterCsvFile {
  blob: Blob;
  filename: string;
}

/* ------------------------------- Public ------------------------------- */

export interface SubscribePayload {
  email: string;
  name?: string;
  phone?: string;
  source?: SubscriberSource;
  location_id?: number;
}

export interface SubscribeResult {
  state: Extract<SubscriberStatus, "pending" | "subscribed">;
  message: string;
}

export type ConfirmResult =
  | "confirmed"
  | "already_confirmed"
  | "expired"
  | "invalid"
  | "unsubscribed";

export interface ConfirmSubscriptionResult {
  result: ConfirmResult;
  state?: SubscriberStatus;
  message: string;
}

export interface UnsubscribeInfo {
  email: string;
  vendor_name: string;
  status: SubscriberStatus;
}

export interface PublicUnsubscribeResult {
  result: "unsubscribed";
  status: "unsubscribed";
  message: string;
}

/* ------------------------------ Customer ------------------------------ */

export interface CustomerSubscribeResult {
  state: Extract<SubscriberStatus, "subscribed" | "pending">;
  message: string;
}
