/**
 * Customer Support Tickets — TanStack Query hooks
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCustomerMessagesPayload } from "./mappers";
import { customerSupportService } from "./support.service";
import type {
  CreateCustomerSupportTicketPayload,
  CreateCustomerSupportTicketResponse,
  CustomerSupportLocationBookingsResponse,
  CustomerSupportLocationsResponse,
  CustomerSupportMessagesParams,
  CustomerSupportMessagesResponse,
  CustomerSupportTicketsParams,
  CustomerSupportTicketsResponse,
  MarkCustomerSupportMessagesReadResponse,
  StoreCustomerSupportMessagePayload,
  StoreCustomerSupportMessageResponse,
} from "./type";

/** Inbox / list poll — pick up new tickets & previews. */
export const CUSTOMER_SUPPORT_LIST_POLL_MS = 30_000;
/** Open thread poll — pick up agent replies faster. */
export const CUSTOMER_SUPPORT_THREAD_POLL_MS = 15_000;

export const customerSupportKeys = {
  all: ["customer", "support-tickets"] as const,
  lists: () => [...customerSupportKeys.all, "list"] as const,
  list: (params: CustomerSupportTicketsParams) =>
    [...customerSupportKeys.lists(), params] as const,
  locations: () => [...customerSupportKeys.all, "locations"] as const,
  locationBookings: (locationId: number | string) =>
    [...customerSupportKeys.all, "location-bookings", String(locationId)] as const,
  messages: (ticketKey: string, params: CustomerSupportMessagesParams = {}) =>
    [...customerSupportKeys.all, "messages", ticketKey, params] as const,
  messagesInfinite: (ticketKey: string, perPage: number = 30) =>
    [...customerSupportKeys.all, "messages-infinite", ticketKey, perPage] as const,
};

function markTicketReadInLists(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketKey: string,
  isUnread: boolean
) {
  queryClient.setQueriesData<CustomerSupportTicketsResponse>(
    { queryKey: customerSupportKeys.lists() },
    (current) => {
      if (!current?.data) return current;
      return {
        ...current,
        data: current.data.map((ticket) =>
          ticket.ticket_key === ticketKey
            ? { ...ticket, is_unread: isUnread }
            : ticket
        ),
      };
    }
  );
}

export function useCustomerSupportTickets(
  params: CustomerSupportTicketsParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery<CustomerSupportTicketsResponse>({
    queryKey: customerSupportKeys.list(params),
    queryFn: () => customerSupportService.getTickets(params),
    enabled: options?.enabled ?? true,
    staleTime: 15 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: CUSTOMER_SUPPORT_LIST_POLL_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });
}

export function useCustomerSupportTicketMessages(
  ticketKey: string | undefined,
  params: CustomerSupportMessagesParams = { page: 1, per_page: 30 },
  options?: { enabled?: boolean }
) {
  return useQuery<CustomerSupportMessagesResponse>({
    queryKey: customerSupportKeys.messages(ticketKey ?? "", params),
    queryFn: () => customerSupportService.getMessages(ticketKey!, params),
    enabled: (options?.enabled ?? true) && Boolean(ticketKey),
    staleTime: 10 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: CUSTOMER_SUPPORT_THREAD_POLL_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });
}

/** Page 1 = latest messages; scroll-up loads older pages via fetchNextPage. */
export function useCustomerSupportTicketMessagesInfinite(
  ticketKey: string | undefined,
  perPage: number = 30,
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: customerSupportKeys.messagesInfinite(ticketKey ?? "", perPage),
    queryFn: ({ pageParam }) =>
      customerSupportService.getMessages(ticketKey!, {
        page: pageParam,
        per_page: perPage,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const payload = getCustomerMessagesPayload(lastPage);
      const current = payload.meta?.current_page ?? 1;
      const last = payload.meta?.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
    enabled: (options?.enabled ?? true) && Boolean(ticketKey),
    staleTime: 10 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: CUSTOMER_SUPPORT_THREAD_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useCustomerSupportLocations(options?: { enabled?: boolean }) {
  return useQuery<CustomerSupportLocationsResponse>({
    queryKey: customerSupportKeys.locations(),
    queryFn: () => customerSupportService.getLocations(),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useCustomerSupportLocationBookings(
  locationId: number | string | null | undefined,
  options?: { enabled?: boolean }
) {
  const hasLocation =
    locationId != null &&
    locationId !== "" &&
    Number(locationId) > 0;

  return useQuery<CustomerSupportLocationBookingsResponse>({
    queryKey: customerSupportKeys.locationBookings(locationId ?? ""),
    queryFn: () => customerSupportService.getLocationBookings(locationId!),
    enabled: (options?.enabled ?? true) && hasLocation,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateCustomerSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateCustomerSupportTicketResponse,
    Error,
    CreateCustomerSupportTicketPayload
  >({
    mutationFn: (payload) => customerSupportService.createTicket(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: customerSupportKeys.all,
      });
    },
  });
}

export function useStoreCustomerSupportMessage() {
  const queryClient = useQueryClient();

  return useMutation<
    StoreCustomerSupportMessageResponse,
    Error,
    StoreCustomerSupportMessagePayload
  >({
    mutationFn: (payload) => customerSupportService.storeMessage(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [
          ...customerSupportKeys.all,
          "messages",
          variables.ticketKey,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          ...customerSupportKeys.all,
          "messages-infinite",
          variables.ticketKey,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: customerSupportKeys.all,
      });
    },
  });
}

export function useMarkCustomerSupportMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation<
    MarkCustomerSupportMessagesReadResponse,
    Error,
    string
  >({
    mutationFn: (ticketKey) =>
      customerSupportService.markMessagesRead(ticketKey),
    onMutate: (ticketKey) => {
      markTicketReadInLists(queryClient, ticketKey, false);
    },
    onSuccess: (response, ticketKey) => {
      markTicketReadInLists(
        queryClient,
        ticketKey,
        Boolean(response.data?.is_unread)
      );
    },
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: customerSupportKeys.lists(),
      });
    },
  });
}
