/**
 * Admin Support Tickets — TanStack Query hooks
 */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { DashboardDateFilter } from "@/app/(protected)/admin/support/_lib/types";
import {
  adminSupportService,
  toAdminSupportDashboardParams,
} from "./support.service";
import { getAdminMessagesPayload } from "./mappers";
import type {
  AdminSupportDashboardParams,
  AdminSupportDashboardResponse,
  AdminSupportMessagesParams,
  AdminSupportMessagesResponse,
  AdminSupportTicketsParams,
  AdminSupportTicketsResponse,
  AssignAdminSupportTicketPayload,
  AssignAdminSupportTicketResponse,
  CloseAdminSupportTicketPayload,
  CloseAdminSupportTicketResponse,
  MarkAdminSupportMessagesReadResponse,
  PinAdminSupportTicketPayload,
  PinAdminSupportTicketResponse,
  StoreAdminSupportMessagePayload,
  StoreAdminSupportMessageResponse,
} from "./type";

export const ADMIN_SUPPORT_LIST_POLL_MS = 30_000;
export const ADMIN_SUPPORT_DASHBOARD_POLL_MS = 30_000;
/** Open thread poll — pick up new messages faster. */
export const ADMIN_SUPPORT_THREAD_POLL_MS = 15_000;

export const adminSupportKeys = {
  all: ["admin", "support-tickets"] as const,
  dashboards: () => [...adminSupportKeys.all, "dashboard"] as const,
  dashboard: (params: AdminSupportDashboardParams) =>
    [...adminSupportKeys.dashboards(), params] as const,
  lists: () => [...adminSupportKeys.all, "list"] as const,
  list: (params: AdminSupportTicketsParams) =>
    [...adminSupportKeys.lists(), params] as const,
  messages: (ticketKey: string, params: AdminSupportMessagesParams = {}) =>
    [...adminSupportKeys.all, "messages", ticketKey, params] as const,
  messagesInfinite: (ticketKey: string, perPage: number = 30) =>
    [...adminSupportKeys.all, "messages-infinite", ticketKey, perPage] as const,
};

function patchMessagesCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  updater: (
    page: AdminSupportMessagesResponse
  ) => AdminSupportMessagesResponse
) {
  queryClient.setQueriesData<AdminSupportMessagesResponse>(
    { queryKey: [...adminSupportKeys.all, "messages", ticketKey] },
    (current) => (current ? updater(current) : current)
  );

  queryClient.setQueriesData(
    { queryKey: [...adminSupportKeys.all, "messages-infinite", ticketKey] },
    (current: unknown) => {
      if (!current || typeof current !== "object") return current;
      const infinite = current as {
        pages?: AdminSupportMessagesResponse[];
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

function setTicketPinnedInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  isPinned: boolean
) {
  queryClient.setQueriesData<AdminSupportTicketsResponse>(
    { queryKey: adminSupportKeys.lists() },
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

function setTicketUnreadInLists(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  isUnread: boolean
) {
  queryClient.setQueriesData<AdminSupportTicketsResponse>(
    { queryKey: adminSupportKeys.lists() },
    (current) => {
      if (!current?.data) return current;

      const ticket = current.data.find(
        (item) => item.ticket_key === ticketKey
      );
      if (!ticket || ticket.is_unread === isUnread) return current;

      return {
        ...current,
        data: current.data.map((item) =>
          item.ticket_key === ticketKey
            ? { ...item, is_unread: isUnread }
            : item
        ),
      };
    }
  );
}

function setTicketAssigneeInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  assignee: { id: number | string | null; name: string | null }
) {
  queryClient.setQueriesData<AdminSupportTicketsResponse>(
    { queryKey: adminSupportKeys.lists() },
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

function applyCloseToCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  status: string = "resolved",
  options?: { can_reply?: boolean }
) {
  const statusLabel =
    status === "resolved"
      ? "Resolved"
      : status === "closed"
        ? "Closed"
        : status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  queryClient.setQueriesData<AdminSupportTicketsResponse>(
    { queryKey: adminSupportKeys.lists() },
    (current) => {
      if (!current?.data) return current;
      return {
        ...current,
        data: current.data.map((ticket) =>
          ticket.ticket_key === ticketKey
            ? {
                ...ticket,
                status,
                status_label: statusLabel,
              }
            : ticket
        ),
      };
    }
  );

  const canReply = options?.can_reply ?? false;

  patchMessagesCaches(queryClient, ticketKey, (page) => {
    if (!page.ticket) {
      return {
        ...page,
        can_reply: canReply,
        can_manage: false,
        can_pin: false,
      };
    }
    return {
      ...page,
      can_reply: canReply,
      can_manage: false,
      can_pin: false,
      ticket: {
        ...page.ticket,
        status,
        status_label: statusLabel,
      },
    };
  });
}

export function useAdminSupportDashboard(filter: DashboardDateFilter) {
  const params = toAdminSupportDashboardParams(filter);

  return useQuery<AdminSupportDashboardResponse>({
    queryKey: adminSupportKeys.dashboard(params),
    queryFn: () => adminSupportService.getDashboard(params),
    staleTime: 15 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: ADMIN_SUPPORT_DASHBOARD_POLL_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });
}

export function useAdminSupportTickets(
  params: AdminSupportTicketsParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery<AdminSupportTicketsResponse>({
    queryKey: adminSupportKeys.list(params),
    queryFn: () => adminSupportService.getTickets(params),
    enabled: options?.enabled ?? true,
    staleTime: 15 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: ADMIN_SUPPORT_LIST_POLL_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });
}

export function useAdminSupportTicketMessages(
  ticketKey: string | undefined,
  params: AdminSupportMessagesParams = { page: 1, per_page: 30 },
  options?: { enabled?: boolean }
) {
  return useQuery<AdminSupportMessagesResponse>({
    queryKey: adminSupportKeys.messages(ticketKey ?? "", params),
    queryFn: () => adminSupportService.getMessages(ticketKey!, params),
    enabled: (options?.enabled ?? true) && Boolean(ticketKey),
    staleTime: 10 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: ADMIN_SUPPORT_THREAD_POLL_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });
}

/**
 * Paginated messages for the chat pane.
 * Page 1 is the latest chunk; older history loads via fetchNextPage (scroll up).
 */
export function useAdminSupportTicketMessagesInfinite(
  ticketKey: string | undefined,
  perPage: number = 30,
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: adminSupportKeys.messagesInfinite(ticketKey ?? "", perPage),
    queryFn: ({ pageParam }) =>
      adminSupportService.getMessages(ticketKey!, {
        page: pageParam,
        per_page: perPage,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const payload = getAdminMessagesPayload(lastPage);
      const current = payload.meta?.current_page ?? 1;
      const last = payload.meta?.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
    enabled: (options?.enabled ?? true) && Boolean(ticketKey),
    staleTime: 10 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: ADMIN_SUPPORT_THREAD_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useMarkAdminSupportMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation<
    MarkAdminSupportMessagesReadResponse,
    Error,
    string
  >({
    mutationFn: (ticketKey) =>
      adminSupportService.markMessagesRead(ticketKey),
    onMutate: (ticketKey) => {
      setTicketUnreadInLists(queryClient, ticketKey, false);
    },
    onSuccess: (response, ticketKey) => {
      setTicketUnreadInLists(
        queryClient,
        ticketKey,
        Boolean(response.data?.is_unread)
      );
    },
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: adminSupportKeys.lists(),
      });
    },
  });
}

export function usePinAdminSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<
    PinAdminSupportTicketResponse,
    Error,
    PinAdminSupportTicketPayload
  >({
    mutationFn: (payload) => adminSupportService.pinTicket(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: adminSupportKeys.all });
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

export function useAssignAdminSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<
    AssignAdminSupportTicketResponse,
    Error,
    AssignAdminSupportTicketPayload & { staff_name?: string | null }
  >({
    mutationFn: (payload) =>
      adminSupportService.assignTicket({
        ticketKey: payload.ticketKey,
        staff_id: payload.staff_id,
      }),
    onSuccess: (response, payload) => {
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
        queryKey: adminSupportKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: [
          ...adminSupportKeys.all,
          "messages-infinite",
          payload.ticketKey,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: [...adminSupportKeys.all, "messages", payload.ticketKey],
      });
    },
  });
}

export function useCloseAdminSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<
    CloseAdminSupportTicketResponse,
    Error,
    CloseAdminSupportTicketPayload
  >({
    mutationFn: (payload) => adminSupportService.closeTicket(payload),
    onSuccess: (response, payload) => {
      const status =
        typeof response.data?.status === "string"
          ? response.data.status
          : "resolved";
      applyCloseToCaches(queryClient, payload.ticketKey, status, {
        can_reply: response.data?.can_reply ?? false,
      });
      void queryClient.invalidateQueries({
        queryKey: adminSupportKeys.all,
      });
    },
  });
}

export function useStoreAdminSupportMessage() {
  const queryClient = useQueryClient();

  return useMutation<
    StoreAdminSupportMessageResponse,
    Error,
    StoreAdminSupportMessagePayload
  >({
    mutationFn: (payload) => adminSupportService.storeMessage(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [
          ...adminSupportKeys.all,
          "messages",
          variables.ticketKey,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          ...adminSupportKeys.all,
          "messages-infinite",
          variables.ticketKey,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: adminSupportKeys.lists(),
      });
    },
  });
}
