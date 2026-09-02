/**
 * Vendor Support Tickets — TanStack Query hooks
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DashboardDateFilter } from "@/app/(protected)/vendor/support/_lib/types";
import { normalizeSupportStatus } from "@/app/(protected)/vendor/support/_lib/utils";
import {
  toVendorSupportDashboardParams,
  vendorSupportService,
} from "./support.service";
import { getVendorMessagesPayload } from "./mappers";
import type {
  AssignVendorSupportTicketPayload,
  AssignVendorSupportTicketResponse,
  CloseVendorSupportTicketPayload,
  CloseVendorSupportTicketResponse,
  CreateVendorSupportTicketPayload,
  CreateVendorSupportTicketResponse,
  EscalateVendorSupportTicketResponse,
  MarkVendorSupportMessagesReadResponse,
  PinVendorSupportTicketPayload,
  PinVendorSupportTicketResponse,
  StoreVendorSupportMessagePayload,
  StoreVendorSupportMessageResponse,
  VendorSupportDashboardParams,
  VendorSupportDashboardResponse,
  VendorSupportMessagesParams,
  VendorSupportMessagesResponse,
  VendorSupportTicketsParams,
  VendorSupportTicketsResponse,
} from "./type";

/** Background poll so open dashboards / inboxes pick up new tickets. */
export const VENDOR_SUPPORT_LIST_POLL_MS = 30_000;
/** Open thread poll — pick up new messages faster. */
export const VENDOR_SUPPORT_THREAD_POLL_MS = 15_000;

export const vendorSupportKeys = {
  all: ["vendor", "support-tickets"] as const,
  dashboard: (params: VendorSupportDashboardParams) =>
    [...vendorSupportKeys.all, "dashboard", params] as const,
  lists: () => [...vendorSupportKeys.all, "list"] as const,
  list: (params: VendorSupportTicketsParams) =>
    [...vendorSupportKeys.lists(), params] as const,
  messages: (ticketKey: string, params: VendorSupportMessagesParams = {}) =>
    [...vendorSupportKeys.all, "messages", ticketKey, params] as const,
  messagesInfinite: (ticketKey: string, perPage: number = 30) =>
    [...vendorSupportKeys.all, "messages-infinite", ticketKey, perPage] as const,
};

function markTicketReadInLists(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  isUnread: boolean,
  unreadCount?: number
) {
  queryClient.setQueriesData<VendorSupportTicketsResponse>(
    { queryKey: vendorSupportKeys.lists() },
    (current) => {
      if (!current?.data) return current;

      const ticket = current.data.find((item) => item.ticket_key === ticketKey);
      const wasUnread = ticket?.is_unread === true;

      let nextUnreadCount = current.unread_count;
      if (typeof unreadCount === "number") {
        nextUnreadCount = Math.max(0, unreadCount);
      } else if (
        typeof current.unread_count === "number" &&
        !isUnread &&
        wasUnread
      ) {
        nextUnreadCount = Math.max(0, current.unread_count - 1);
      } else if (
        typeof current.unread_count === "number" &&
        isUnread &&
        !wasUnread
      ) {
        nextUnreadCount = current.unread_count + 1;
      }

      return {
        ...current,
        unread_count: nextUnreadCount,
        data: current.data.map((ticket) =>
          ticket.ticket_key === ticketKey
            ? { ...ticket, is_unread: isUnread }
            : ticket
        ),
      };
    }
  );
}

function patchMessagesCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  updater: (
    page: VendorSupportMessagesResponse
  ) => VendorSupportMessagesResponse
) {
  queryClient.setQueriesData<VendorSupportMessagesResponse>(
    { queryKey: [...vendorSupportKeys.all, "messages", ticketKey] },
    (current) => (current ? updater(current) : current)
  );

  queryClient.setQueriesData(
    { queryKey: [...vendorSupportKeys.all, "messages-infinite", ticketKey] },
    (current: unknown) => {
      if (!current || typeof current !== "object") return current;
      const infinite = current as {
        pages?: VendorSupportMessagesResponse[];
        [key: string]: unknown;
      };
      if (!Array.isArray(infinite.pages)) return current;
      return {
        ...infinite,
        pages: infinite.pages.map((page) => updater(page)),
      };
    }
  );
}

function setTicketAssigneeInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  assignee: { id: number | string | null; name: string | null }
) {
  queryClient.setQueriesData<VendorSupportTicketsResponse>(
    { queryKey: vendorSupportKeys.lists() },
    (current) => {
      if (!current?.data) return current;
      return {
        ...current,
        data: current.data.map((ticket) =>
          ticket.ticket_key === ticketKey
            ? {
              ...ticket,
              assignee_id: assignee.id,
              assignee_name: assignee.name,
            }
            : ticket
        ),
      };
    }
  );

  const nextAssignee =
    assignee.id == null
      ? null
      : {
        id: assignee.id,
        full_name: assignee.name ?? undefined,
        name: assignee.name ?? undefined,
      };

  patchMessagesCaches(queryClient, ticketKey, (page) => ({
    ...page,
    assignee: nextAssignee,
  }));
}

function setTicketPinnedInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  isPinned: boolean
) {
  queryClient.setQueriesData<VendorSupportTicketsResponse>(
    { queryKey: vendorSupportKeys.lists() },
    (current) => {
      if (!current?.data) return current;
      return {
        ...current,
        data: current.data.map((ticket) =>
          ticket.ticket_key === ticketKey
            ? { ...ticket, is_pinned: isPinned }
            : ticket
        ),
      };
    }
  );

  patchMessagesCaches(queryClient, ticketKey, (page) => {
    if (!page.ticket) return page;
    return {
      ...page,
      ticket: {
        ...page.ticket,
        is_pinned: isPinned,
      },
    };
  });
}

function applyEscalateToCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  data: EscalateVendorSupportTicketResponse["data"]
) {
  queryClient.setQueriesData<VendorSupportTicketsResponse>(
    { queryKey: vendorSupportKeys.lists() },
    (current) => {
      if (!current?.data) return current;
      const nextStatus = normalizeSupportStatus(data.status);
      return {
        ...current,
        data: current.data.map((ticket) =>
          ticket.ticket_key === ticketKey
            ? {
                ...ticket,
                status: nextStatus,
                status_label:
                  data.status_label?.trim() || ticket.status_label,
                category_label:
                  data.category === "technical"
                    ? "Technical Support"
                    : ticket.category_label,
              }
            : ticket
        ),
      };
    }
  );

  patchMessagesCaches(queryClient, ticketKey, (page) => {
    const nextStatus = normalizeSupportStatus(data.status);
    if (!page.ticket) {
      return {
        ...page,
        can_reply: data.can_reply,
        can_manage: false,
        can_pin: false,
      };
    }
    return {
      ...page,
      can_reply: data.can_reply,
      can_manage: false,
      can_pin: false,
      ticket: {
        ...page.ticket,
        status: nextStatus,
        status_label:
          data.status_label?.trim() || page.ticket.status_label,
        category_label:
          data.category === "technical"
            ? "Technical Support"
            : page.ticket.category_label,
      },
    };
  });
}

function applyCloseToCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  status: string = "closed"
) {
  queryClient.setQueriesData<VendorSupportTicketsResponse>(
    { queryKey: vendorSupportKeys.lists() },
    (current) => {
      if (!current?.data) return current;
      return {
        ...current,
        data: current.data.map((ticket) =>
          ticket.ticket_key === ticketKey
            ? {
              ...ticket,
              status,
              status_label: "Closed",
            }
            : ticket
        ),
      };
    }
  );

  patchMessagesCaches(queryClient, ticketKey, (page) => {
    if (!page.ticket) {
      return {
        ...page,
        can_reply: false,
        can_manage: false,
        can_pin: false,
      };
    }
    return {
      ...page,
      can_reply: false,
      can_manage: false,
      can_pin: false,
      ticket: {
        ...page.ticket,
        status,
        status_label: "Closed",
      },
    };
  });
}

export function useVendorSupportDashboard(filter: DashboardDateFilter) {
  const params = toVendorSupportDashboardParams(filter);

  return useQuery<VendorSupportDashboardResponse>({
    queryKey: vendorSupportKeys.dashboard(params),
    queryFn: () => vendorSupportService.getDashboard(params),
    staleTime: 15 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: VENDOR_SUPPORT_LIST_POLL_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });
}

export function useVendorSupportTickets(
  params: VendorSupportTicketsParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery<VendorSupportTicketsResponse>({
    queryKey: vendorSupportKeys.list(params),
    queryFn: () => vendorSupportService.getTickets(params),
    enabled: options?.enabled ?? true,
    staleTime: 15 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: VENDOR_SUPPORT_LIST_POLL_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });
}

export function useVendorSupportTicketMessages(
  ticketKey: string | undefined,
  params: VendorSupportMessagesParams = { page: 1, per_page: 30 },
  options?: { enabled?: boolean }
) {
  return useQuery<VendorSupportMessagesResponse>({
    queryKey: vendorSupportKeys.messages(ticketKey ?? "", params),
    queryFn: () => vendorSupportService.getMessages(ticketKey!, params),
    enabled: (options?.enabled ?? true) && Boolean(ticketKey),
    staleTime: 10 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: VENDOR_SUPPORT_THREAD_POLL_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });
}

/**
 * Paginated messages for the chat pane.
 * Page 1 is the latest chunk; older history loads via fetchNextPage (scroll up).
 */
export function useVendorSupportTicketMessagesInfinite(
  ticketKey: string | undefined,
  perPage: number = 30,
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: vendorSupportKeys.messagesInfinite(ticketKey ?? "", perPage),
    queryFn: ({ pageParam }) =>
      vendorSupportService.getMessages(ticketKey!, {
        page: pageParam,
        per_page: perPage,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const payload = getVendorMessagesPayload(lastPage);
      const current = payload.meta?.current_page ?? 1;
      const last = payload.meta?.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
    enabled: (options?.enabled ?? true) && Boolean(ticketKey),
    staleTime: 10 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: VENDOR_SUPPORT_THREAD_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useMarkVendorSupportMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation<
    MarkVendorSupportMessagesReadResponse,
    Error,
    string
  >({
    mutationFn: (ticketKey) =>
      vendorSupportService.markMessagesRead(ticketKey),
    onMutate: (ticketKey) => {
      markTicketReadInLists(queryClient, ticketKey, false);
    },
    onSuccess: (response, ticketKey) => {
      markTicketReadInLists(
        queryClient,
        ticketKey,
        Boolean(response.data?.is_unread),
        response.data?.unread_count
      );
    },
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: vendorSupportKeys.lists(),
      });
    },
  });
}

export function useCreateVendorSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateVendorSupportTicketResponse,
    Error,
    CreateVendorSupportTicketPayload
  >({
    mutationFn: (payload) => vendorSupportService.createTicket(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: vendorSupportKeys.all,
      });
    },
  });
}

export function usePinVendorSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<
    PinVendorSupportTicketResponse,
    Error,
    PinVendorSupportTicketPayload
  >({
    mutationFn: (payload) => vendorSupportService.pinTicket(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: vendorSupportKeys.all });
      setTicketPinnedInCaches(
        queryClient,
        payload.ticketKey,
        payload.is_pinned
      );
    },
    onSuccess: (response, payload) => {
      const isPinned =
        typeof response.data?.is_pinned === "boolean"
          ? response.data.is_pinned
          : payload.is_pinned;
      setTicketPinnedInCaches(queryClient, payload.ticketKey, isPinned);
    },
    onError: (_error, payload) => {
      setTicketPinnedInCaches(
        queryClient,
        payload.ticketKey,
        !payload.is_pinned
      );
    },
  });
}

export function useEscalateVendorSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<
    EscalateVendorSupportTicketResponse,
    Error,
    string
  >({
    mutationFn: (ticketKey) =>
      vendorSupportService.escalateTicket(ticketKey),
    onSuccess: (response, ticketKey) => {
      if (response.data) {
        applyEscalateToCaches(queryClient, ticketKey, response.data);
      }
      void queryClient.invalidateQueries({
        queryKey: vendorSupportKeys.all,
      });
    },
  });
}

export function useCloseVendorSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<
    CloseVendorSupportTicketResponse,
    Error,
    CloseVendorSupportTicketPayload
  >({
    mutationFn: (payload) => vendorSupportService.closeTicket(payload),
    onSuccess: (response, payload) => {
      const status =
        typeof response.data?.status === "string"
          ? response.data.status
          : "closed";
      applyCloseToCaches(queryClient, payload.ticketKey, status);
      void queryClient.invalidateQueries({
        queryKey: vendorSupportKeys.all,
      });
    },
  });
}

export function useAssignVendorSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<
    AssignVendorSupportTicketResponse,
    Error,
    AssignVendorSupportTicketPayload & { staff_name?: string | null }
  >({
    mutationFn: (payload) =>
      vendorSupportService.assignTicket({
        ticketKey: payload.ticketKey,
        staff_id: payload.staff_id,
      }),
    onSuccess: (response, payload) => {
      // Unassign must stay null — don't rebuild from stale response fields.
      const assigneeId =
        payload.staff_id == null
          ? null
          : (response.data?.assignee?.id ??
            response.data?.assignee_id ??
            payload.staff_id);
      const assigneeName =
        assigneeId == null
          ? null
          : response.data?.assignee?.full_name?.trim() ||
          response.data?.assignee?.name?.trim() ||
          (typeof response.data?.assignee_name === "string"
            ? response.data.assignee_name
            : null) ||
          payload.staff_name ||
          null;

      setTicketAssigneeInCaches(queryClient, payload.ticketKey, {
        id: assigneeId,
        name: assigneeName,
      });

      void queryClient.invalidateQueries({
        queryKey: vendorSupportKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: [
          ...vendorSupportKeys.all,
          "messages-infinite",
          payload.ticketKey,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          ...vendorSupportKeys.all,
          "messages",
          payload.ticketKey,
        ],
      });
    },
  });
}

export function useStoreVendorSupportMessage() {
  const queryClient = useQueryClient();

  return useMutation<
    StoreVendorSupportMessageResponse,
    Error,
    StoreVendorSupportMessagePayload
  >({
    mutationFn: (payload) => vendorSupportService.storeMessage(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [
          ...vendorSupportKeys.all,
          "messages",
          variables.ticketKey,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          ...vendorSupportKeys.all,
          "messages-infinite",
          variables.ticketKey,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: vendorSupportKeys.lists(),
      });
    },
  });
}
