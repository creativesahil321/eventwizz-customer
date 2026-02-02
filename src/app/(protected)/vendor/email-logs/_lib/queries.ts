/**
 * Vendor Email Logs React Query Hooks
 * TanStack Query hooks for vendor email logs management
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { vendorEmailLogsService } from "@/services/vendor/email-logs/email-logs.service";
import type { EmailLogsQueryParams } from "@/services/vendor/email-logs/email-logs.service";
import type { EmailLog } from "./types";
import type { ApiResponse } from "@/services/core/api-client";

/**
 * Query keys factory for email logs
 */
export const emailLogsKeys = {
  all: ["vendor", "email-logs"] as const,
  lists: () => [...emailLogsKeys.all, "list"] as const,
  list: (params?: EmailLogsQueryParams) =>
    [...emailLogsKeys.lists(), params] as const,
};

/**
 * Hook to fetch email logs
 * @param params Query parameters (page, per_page, search, from_date, to_date)
 * @returns Query result with email logs data
 */
export const useEmailLogs = (params: EmailLogsQueryParams = {}) => {
  const {
    search = "",
    page = 1,
    per_page = 30,
    from_date = "",
    to_date = "",
  } = params;

  return useQuery({
    queryKey: emailLogsKeys.list({ search, page, per_page, from_date, to_date }),
    queryFn: async () => {
      const response = await vendorEmailLogsService.getEmailLogs({
        search: search || undefined,
        page: Number(page) || 1,
        per_page: Number(per_page) || 30,
        from_date: from_date || undefined,
        to_date: to_date || undefined,
      });

      // Transform API response to match EmailLog interface
      // API returns data as array directly, not nested
      // Keep both original and mapped fields for compatibility
      const transformedData: EmailLog[] = response.data.map((item) => ({
        ...item,
        emailTo: item.email_to, // Mapped field for UI
        body: item.content, // Mapped field for UI
        created_at: item.date, // Mapped field for UI
        // Original fields are already included via spread
      }));

      return {
        status: response.status,
        message: response.message,
        data: transformedData,
        links: response.links,
        meta: response.meta,
        errors: response.errors || [],
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to delete an email log
 * @returns Mutation hook for deleting email logs
 */
export const useDeleteEmailLog = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<unknown>,
    Error,
    number | string
  >({
    mutationFn: (id: number | string) =>
      vendorEmailLogsService.deleteEmailLog(id),
    onSuccess: (response) => {
      if (response.status) {
        // Invalidate email logs list queries to refetch
        queryClient.invalidateQueries({
          queryKey: emailLogsKeys.lists(),
        });
        // Toast notification handled automatically by API client interceptor
      }
    },
    onError: () => {
      // Error toast notification handled automatically by API client interceptor
    },
  });
};

/**
 * Resend email payload
 */
export interface ResendEmailPayload {
  id: number | string;
  subject: string;
  message: string;
}

/**
 * Hook to resend an email
 * @returns Mutation hook for resending emails
 */
export const useResendEmail = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<unknown>,
    Error,
    ResendEmailPayload
  >({
    mutationFn: (payload: ResendEmailPayload) =>
      vendorEmailLogsService.resendEmail(payload),
    onSuccess: (response) => {
      if (response.status) {
        // Invalidate email logs list queries to refetch
        queryClient.invalidateQueries({
          queryKey: emailLogsKeys.lists(),
        });
        // Toast notification handled automatically by API client interceptor
      }
    },
    onError: () => {
      // Error toast notification handled automatically by API client interceptor
    },
  });
};

/**
 * Hook to bulk delete email logs
 * @returns Mutation hook for bulk deleting email logs
 */
export const useBulkDeleteEmailLogs = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<unknown>,
    Error,
    (number | string)[]
  >({
    mutationFn: (emailLogIds: (number | string)[]) =>
      vendorEmailLogsService.bulkDeleteEmailLogs(emailLogIds),
    onSuccess: (response) => {
      if (response.status) {
        // Invalidate email logs list queries to refetch
        queryClient.invalidateQueries({
          queryKey: emailLogsKeys.lists(),
        });
        // Toast notification handled automatically by API client interceptor
      }
    },
    onError: () => {
      // Error toast notification handled automatically by API client interceptor
    },
  });
};
