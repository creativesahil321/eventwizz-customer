import { QueryOptions } from "@tanstack/react-query";
import { Row } from "@tanstack/react-table";
import type {
  EmailLogItem,
  EmailLogsResponse,
  EmailLogsQueryParams,
} from "@/services/vendor/email-logs/email-logs.service";

/**
 * Email Log interface representing an email record
 * Extends EmailLogItem with additional mapped fields for UI compatibility
 */
export interface EmailLog extends Omit<EmailLogItem, "email_to" | "content"> {
  emailTo: string; // Maps from email_to for UI compatibility
  body: string; // Maps from content for UI compatibility
  created_at: string; // Maps from date for UI compatibility
  // Keep original fields from EmailLogItem
  email_to: string;
  content: string;
  date: string;
}

/**
 * API response for email logs
 * Re-export from service for convenience
 */
export type { EmailLogsResponse } from "@/services/vendor/email-logs/email-logs.service";

/**
 * Data table row action type
 */
export type DataTableRowAction<TData> = {
  row: Row<TData>;
  type: "show" | "delete" | "resend";
};

/**
 * Email log query parameters
 * Re-export from service for convenience
 */
export type { EmailLogsQueryParams as EmailLogQueryParams } from "@/services/vendor/email-logs/email-logs.service";

/**
 * Email reply payload
 */
export interface EmailReplyPayload {
  emailTo: string;
  subject: string;
  body: string;
  replyToId?: number | string;
}

/**
 * Email reply response
 */
export interface EmailReplyResponse {
  status: boolean;
  message: string;
  data: unknown;
  errors: string[];
}

export type SearchParams = {
  page?: string;
  per_page?: string;
  status?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  filters?: string;
  [key: string]: string | string[] | undefined;
};

/**
 * Use Email Log Query Parameters
 */
export type UseEmailLogQueryParams = EmailLogsQueryParams & {
  options?: QueryOptions<EmailLogsResponse, Error>;
};
