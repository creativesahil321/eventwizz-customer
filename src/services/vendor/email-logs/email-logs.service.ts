/**
 * Vendor Email Logs Service
 * Handles API calls related to vendor email logs
 */

import { api, ApiResponse } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";

/**
 * Email log item from API
 */
export interface EmailLogItem {
  id: number;
  email_to: string;
  subject: string;
  content: string;
  type: "automatic" | "manual";
  role: string;
  status: "Success" | "Failed";
  failure_reason: string;
  date: string;
  updated_at: string;
}

/**
 * Pagination links
 */
export interface EmailLogsLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

/**
 * Pagination meta
 */
export interface EmailLogsMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  path: string;
  links: Array<{
    url: string | null;
    label: string;
    page: number | null;
    active: boolean;
  }>;
}

/**
 * Email logs API response
 */
export interface EmailLogsResponse {
  status: boolean;
  message: string;
  data: EmailLogItem[];
  links: EmailLogsLinks;
  meta: EmailLogsMeta;
  errors: string[];
}

/**
 * Email logs query parameters
 */
export interface EmailLogsQueryParams {
  page?: number | string;
  per_page?: number | string;
  search?: string;
  from_date?: string;
  to_date?: string;
}

/**
 * Vendor Email Logs Service
 */
export const vendorEmailLogsService = {
  /**
   * Fetch all email logs with optional search parameters
   * @param params Search parameters (page, per_page, search, date)
   * @returns Promise with email logs data
   */
  getEmailLogs: (params?: EmailLogsQueryParams) => {
    return api.get<EmailLogsResponse>(
      API_ENDPOINTS.VENDOR.EMAIL_LOGS.GET_ALL,
      {
        params,
        returnFullResponse: true,
      }
    );
  },

  /**
   * Delete an email log
   * @param id Email log ID
   * @returns Promise with response
   */
  deleteEmailLog: (id: number | string) => {
    const url = API_ENDPOINTS.VENDOR.EMAIL_LOGS.DELETE.replace(
      "{id}",
      id.toString()
    );
    return api.delete<ApiResponse<unknown>>(url, {
      returnFullResponse: true,
    });
  },

  /**
   * Resend an email
   * @param payload Resend email payload (id, subject, message)
   * @returns Promise with response
   */
  resendEmail: (payload: {
    id: number | string;
    subject: string;
    message: string;
  }) => {
    return api.post<ApiResponse<unknown>>(
      API_ENDPOINTS.VENDOR.EMAIL_LOGS.RESEND,
      payload,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Bulk delete email logs
   * @param emailLogIds Array of email log IDs to delete
   * @returns Promise with bulk delete operation result
   */
  bulkDeleteEmailLogs: (emailLogIds: (number | string)[]) => {
    // Format payload as FormData with array notation: email_log_ids[0]:2, email_log_ids[1]:4, etc.
    const formData = new FormData();
    emailLogIds.forEach((id, index) => {
      formData.append(`email_log_ids[${index}]`, id.toString());
    });

    return api.post<ApiResponse<unknown>>(
      API_ENDPOINTS.VENDOR.EMAIL_LOGS.BULK_DELETE,
      formData,
      {
        returnFullResponse: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  },
};
