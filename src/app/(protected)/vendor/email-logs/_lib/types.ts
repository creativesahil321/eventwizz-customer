import { QueryOptions } from "@tanstack/react-query";
import { Row } from "@tanstack/react-table";

/**
 * Email Log interface representing an email record
 */
export interface EmailLog {
  id: number | string;
  emailTo: string;
  emailFrom?: string;
  subject: string;
  body: string;
  role: string;
  created_at: string;
  updated_at?: string;
  status?: "sent" | "failed" | "pending";
}

/**
 * API response for email logs
 */
export interface EmailLogResponse {
  status: number | boolean;
  message: string;
  data: {
    data: EmailLog[];
    links: {
      first: string;
      last: string;
      prev: string | null;
      next: string | null;
    };
    meta: {
      current_page: number;
      from: number;
      last_page: number;
      path: string;
      per_page: number;
      to: number;
      total: number;
    };
  };
  error: string[];
}

/**
 * Data table row action type
 */
export type DataTableRowAction<TData> = {
  row: Row<TData>;
  type: "show" | "delete" | "reply";
};

/**
 * Email log query parameters
 */
export interface EmailLogQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

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
  from?: string;
  to?: string;
  filters?: string;
  [key: string]: string | string[] | undefined;
};

export type AdminEmailLogsParams = {
  search?: string;
  page?: number | string;
  per_page?: number | string;
  status?: string;
};

export type UseEmailLogQueryParams = AdminEmailLogsParams & {
  options?: QueryOptions<EmailLog, Error>;
};
