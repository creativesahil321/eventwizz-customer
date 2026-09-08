"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Inbox, Loader2, Mail, Pin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import {
  BookingBadge,
  PriorityBadge,
  SourceBadge,
  StatusBadge,
  VenueBadge,
} from "./support-badges";
import AdminConversationHeader from "./admin-conversation-header";
import AdminConversationSidebar from "./admin-conversation-sidebar";
import AdminConversationThread from "./admin-conversation-thread";
import AssignTicketDialog from "@/app/(protected)/_shared/support/assign-ticket-dialog";
import AdminSupportInboxFilters, {
  AdminInboxSortSelect,
  DEFAULT_ADMIN_INBOX_FILTERS,
  type AdminInboxFilters,
} from "./support-inbox-filters";
import type {
  AdminSupportConversation,
  AdminSupportMessage,
  SupportAssignee,
  SupportStatus,
} from "../_lib/types";
import {
  ADMIN_INBOX_STATUS_FILTERS,
  formatRelativeTime,
  isClosedTicketStatus,
} from "../_lib/utils";
import {
  flattenAdminSupportMessages,
  getAdminMessagesPayload,
  mapAdminInboxDateToApiTime,
  mapAdminRecentTicketToConversation,
  mapAdminSourceFromTicket,
  mapAdminSupportAssignee,
  mapAdminSupportStaff,
  mapAdminSupportTicketToConversation,
  mapAdminSupportVenues,
  mapAdminTicketDetailToConversation,
  toAdminSupportApiSort,
  toAdminSupportApiSourceFilter,
  toAdminSupportApiStatus,
  useAdminSupportTicketMessagesInfinite,
  useAdminSupportTickets,
  useAssignAdminSupportTicket,
  useMarkAdminSupportMessagesRead,
  usePinAdminSupportTicket,
  type AdminSupportTicketsParams,
} from "@/services/admin/support";
import { cn } from "@/lib/utils";
import { resolveSupportUnreadCount } from "@/app/(protected)/_shared/support/support-unread-count";

const CHAT_MESSAGES_PER_PAGE = 30;

function dedupeSortMessages(
  messages: AdminSupportMessage[]
): AdminSupportMessage[] {
  const byId = new Map<string, AdminSupportMessage>();
  for (const message of messages) {
    byId.set(message.id, message);
  }
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function ConversationListItem({
  conversation,
  assignee,
  isSelected,
  isPinned,
}: {
  conversation: AdminSupportConversation;
  assignee: SupportAssignee | null;
  isSelected: boolean;
  isPinned: boolean;
}) {
  const hasUnread = conversation.unreadCount > 0;
  return (
    <Link
      href={`/admin/support/inbox/${conversation.id}`}
      className={cn(
        "block border-b border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50 sm:px-4",
        isSelected && "bg-[var(--color-primary)]/[0.06]",
        hasUnread &&
          !isSelected &&
          "border-l-[3px] border-l-[var(--color-primary)] bg-[var(--color-primary)]/[0.08]",
        hasUnread &&
          isSelected &&
          "border-l-[3px] border-l-[var(--color-primary)]"
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="relative shrink-0">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-white",
              hasUnread
                ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {conversation.contact.name.charAt(0).toUpperCase()}
          </div>
          {hasUnread ? (
            <span
              className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[var(--color-primary)] ring-2 ring-white"
              aria-label={`${conversation.unreadCount} unread`}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <p
                className={cn(
                  "truncate text-xs text-foreground",
                  hasUnread ? "font-bold" : "font-semibold"
                )}
              >
                {conversation.contact.name}
              </p>
              {hasUnread ? (
                <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
                  Unread
                </span>
              ) : null}
              {isPinned ? (
                <Pin className="size-3 shrink-0 fill-[var(--color-primary)] text-[var(--color-primary)]" />
              ) : null}
            </div>
            <span
              className={cn(
                "shrink-0 text-[10px]",
                hasUnread
                  ? "font-semibold text-[var(--color-primary)]"
                  : "text-muted-foreground"
              )}
            >
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          </div>
          <p
            className={cn(
              "mt-0.5 line-clamp-1 text-xs",
              hasUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground"
            )}
          >
            {conversation.subject}
          </p>
          <p
            className={cn(
              "mt-0.5 line-clamp-1 text-[11px] leading-snug",
              hasUnread
                ? "font-medium text-slate-700"
                : "text-muted-foreground"
            )}
          >
            {conversation.lastMessage}
          </p>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <SourceBadge source={conversation.source} />
            <VenueBadge name={conversation.venue.name} />
            {conversation.bookingRef ? (
              <BookingBadge bookingRef={conversation.bookingRef} />
            ) : null}
            <StatusBadge
              status={conversation.status}
              label={conversation.statusLabel}
              reopened={conversation.reopened}
            />
            <PriorityBadge priority={conversation.priority} />
            {assignee ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                {assignee.name.split(" ")[0]}
              </span>
            ) : null}
            <span className="ml-auto shrink-0 text-[10px] font-medium text-muted-foreground">
              {conversation.ref}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ConversationDetail({
  ticketKey,
  fallback,
  listAssignees,
  assigneeOverrides,
  onAssigneeChange,
}: {
  ticketKey: string;
  fallback?: AdminSupportConversation;
  listAssignees: SupportAssignee[];
  assigneeOverrides: Record<string, SupportAssignee | null>;
  onAssigneeChange: (assignee: SupportAssignee | null) => void;
}) {
  const markedReadRef = useRef<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const pinTicket = usePinAdminSupportTicket();
  const assignTicket = useAssignAdminSupportTicket();
  const markMessagesRead = useMarkAdminSupportMessagesRead();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminSupportTicketMessagesInfinite(ticketKey, CHAT_MESSAGES_PER_PAGE);

  const latestPage = data?.pages?.[0];
  const latestPayload = useMemo(
    () => getAdminMessagesPayload(latestPage),
    [latestPage]
  );

  const source = useMemo(() => {
    if (latestPayload.ticket) {
      return mapAdminSourceFromTicket(latestPayload.ticket, fallback?.source);
    }
    return fallback?.source ?? "customer";
  }, [latestPayload.ticket, fallback?.source]);

  const messages = useMemo(() => {
    const pages = data?.pages ?? [];
    const flat = pages.flatMap((page) => {
      const payload = getAdminMessagesPayload(page);
      return flattenAdminSupportMessages(payload.messages, source);
    });
    return dedupeSortMessages(flat);
  }, [data?.pages, source]);

  const conversation = useMemo(() => {
    if (latestPayload.ticket) {
      const mapped = mapAdminTicketDetailToConversation(
        latestPayload.ticket,
        messages,
        latestPayload.customer,
        latestPayload.assignee,
        fallback
      );
      if (
        latestPayload.assignee === undefined &&
        !mapped.assignee &&
        fallback?.assignee
      ) {
        return { ...mapped, assignee: fallback.assignee };
      }
      return mapped;
    }
    if (fallback) {
      return { ...fallback, messages };
    }
    return null;
  }, [
    latestPayload.ticket,
    latestPayload.customer,
    latestPayload.assignee,
    fallback,
    messages,
  ]);

  const [status, setStatus] = useState<SupportStatus>(
    conversation?.status ?? fallback?.status ?? "new"
  );

  useEffect(() => {
    if (conversation?.status) {
      setStatus(conversation.status);
    }
  }, [ticketKey, conversation?.status]);

  // Mark read from the tickets-list unread state as soon as a thread is opened.
  // Do not wait for the messages API — that was clearing/hiding unread UX.
  useEffect(() => {
    if (!ticketKey || markedReadRef.current === ticketKey) return;
    markedReadRef.current = ticketKey;
    markMessagesRead.mutate(ticketKey);
  }, [ticketKey, markMessagesRead]);

  const staffAssignees = useMemo(() => {
    const fromDetail = mapAdminSupportStaff(latestPayload.staff ?? []);
    return fromDetail.length > 0 ? fromDetail : listAssignees;
  }, [latestPayload.staff, listAssignees]);

  const assignee = useMemo(() => {
    if (ticketKey in assigneeOverrides) {
      return assigneeOverrides[ticketKey] ?? null;
    }
    if (latestPayload.assignee !== undefined) {
      return mapAdminSupportAssignee(latestPayload.assignee);
    }
    return conversation?.assignee ?? fallback?.assignee ?? null;
  }, [
    conversation?.assignee,
    fallback?.assignee,
    ticketKey,
    assigneeOverrides,
    latestPayload.assignee,
  ]);

  const isPinned = conversation?.isPinned ?? fallback?.isPinned ?? false;

  const recentTickets = useMemo(
    () =>
      (latestPayload.recent_tickets ?? []).map(
        mapAdminRecentTicketToConversation
      ),
    [latestPayload.recent_tickets]
  );

  const handleTogglePin = () => {
    if (latestPayload.can_pin === false || pinTicket.isPending) return;
    pinTicket.mutate({
      ticketKey,
      is_pinned: !isPinned,
    });
  };

  if (isLoading && !conversation) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-white p-8 lg:min-h-[640px]">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading conversation…
        </p>
      </div>
    );
  }

  if (isError && !conversation) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-white p-8 lg:min-h-[640px]">
        <p className="text-sm text-muted-foreground">
          Couldn’t load this conversation.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!conversation) return null;

  const permissionsReady = Boolean(latestPage);
  const isComposerDisabled =
    !permissionsReady || latestPayload.can_reply === false;
  const canManage = permissionsReady && latestPayload.can_manage !== false;
  const canPin = permissionsReady && latestPayload.can_pin !== false;
  const canEscalate = permissionsReady && latestPayload.can_escalate === true;

  const composerDisabledMessage = isClosedTicketStatus(status)
    ? "This ticket is closed."
    : "Replies are disabled for this ticket.";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden 2xl:flex-row">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <Link
          href="/admin/support/inbox"
          className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-slate-50 xl:hidden"
        >
          <ArrowLeft className="size-4" />
          Back to inbox
        </Link>
        <div className="min-w-0 shrink-0">
          <AdminConversationHeader
            conversation={conversation}
            status={status}
            onStatusChange={setStatus}
            assignee={assignee}
            isPinned={isPinned}
            onTogglePin={canPin ? handleTogglePin : () => undefined}
            canPin={canPin}
            canManage={canManage}
            canEscalate={canEscalate}
            onAssignClick={() => setAssignOpen(true)}
          />
        </div>
        {isLoading && messages.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading messages…
          </div>
        ) : (
          <AdminConversationThread
            ticketKey={ticketKey}
            messages={messages}
            isComposerDisabled={isComposerDisabled}
            disabledMessage={composerDisabledMessage}
            hasMore={Boolean(hasNextPage)}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={() => {
              if (hasNextPage && !isFetchingNextPage) {
                void fetchNextPage();
              }
            }}
          />
        )}
        {canManage && !assignee ? (
          <AssignTicketDialog
            open={assignOpen}
            onOpenChange={setAssignOpen}
            ticketRef={conversation.ref}
            assignees={staffAssignees}
            currentAssignee={assignee}
            onAssigned={onAssigneeChange}
            onConfirm={async (nextAssignee) => {
              const staffId = nextAssignee ? Number(nextAssignee.id) : null;
              if (nextAssignee && !Number.isFinite(staffId)) {
                throw new Error("Invalid staff member");
              }
              await assignTicket.mutateAsync({
                ticketKey,
                staff_id: staffId,
                staff_name: nextAssignee?.name ?? null,
              });
            }}
          />
        ) : null}
      </div>
      <div className="hidden h-full min-h-0 w-[260px] shrink-0 overflow-y-auto border-l border-slate-200 2xl:block">
        <AdminConversationSidebar
          conversation={conversation}
          assignee={assignee}
          onAssignClick={canManage && !assignee ? () => setAssignOpen(true) : undefined}
          recentTickets={recentTickets}
          isLoadingRecent={isLoading && recentTickets.length === 0}
        />
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="hidden min-h-[520px] flex-1 flex-col items-center justify-center bg-slate-50/30 p-8 text-center xl:flex">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10">
        <Mail className="size-7 text-[var(--color-primary)]" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">
        Select a conversation
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Pick a thread on the left to view customer and vendor support across
        venues.
      </p>
    </div>
  );
}

interface AdminSupportInboxProps {
  selectedId?: string;
}

function getInitialFilters(searchParams: URLSearchParams): AdminInboxFilters {
  const status = searchParams.get("status");
  const venue = searchParams.get("venue");
  const next = { ...DEFAULT_ADMIN_INBOX_FILTERS };

  if (
    status &&
    (ADMIN_INBOX_STATUS_FILTERS as readonly string[]).includes(status)
  ) {
    next.status = status as AdminInboxFilters["status"];
  }
  if (venue) {
    next.venue = venue;
  }
  return next;
}

function buildTicketsParams(
  filters: AdminInboxFilters,
  search: string
): AdminSupportTicketsParams {
  const params: AdminSupportTicketsParams = {
    sort: toAdminSupportApiSort(filters.sort),
  };

  const time = mapAdminInboxDateToApiTime(filters.date);
  if (time) params.time = time;

  const q = search.trim();
  if (q) params.search = q;

  if (filters.status !== "all") {
    params.status = toAdminSupportApiStatus(filters.status);
  }
  if (filters.priority !== "all") params.priority = filters.priority;

  const sourceFilter = toAdminSupportApiSourceFilter(filters.source);
  if (sourceFilter) params.filter = sourceFilter;

  if (filters.venue !== "all") {
    params.venue_id = filters.venue;
  }

  if (filters.assignee !== "all" && filters.assignee !== "unassigned") {
    params.assign_to = filters.assignee;
  }

  return params;
}

function getEffectiveAssignee(
  conversation: AdminSupportConversation,
  overrides: Record<string, SupportAssignee | null | undefined>
): SupportAssignee | null {
  if (conversation.id in overrides) {
    return overrides[conversation.id] ?? null;
  }
  return conversation.assignee;
}

export default function AdminSupportInbox({
  selectedId,
}: AdminSupportInboxProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [filters, setFilters] = useState<AdminInboxFilters>(() =>
    getInitialFilters(searchParams)
  );
  const [assigneeOverrides, setAssigneeOverrides] = useState<
    Record<string, SupportAssignee | null>
  >({});

  const ticketsParams = useMemo(
    () => buildTicketsParams(filters, debouncedSearch),
    [filters, debouncedSearch]
  );

  const { data, isLoading, isFetching, isError, refetch } =
    useAdminSupportTickets(ticketsParams);

  const conversations = useMemo(
    () => (data?.data ?? []).map(mapAdminSupportTicketToConversation),
    [data?.data]
  );
  const staffAssignees = useMemo(
    () => mapAdminSupportStaff(data?.staff),
    [data?.staff]
  );
  const venues = useMemo(
    () => mapAdminSupportVenues(data?.venues),
    [data?.venues]
  );
  const inboxCount = data?.inbox_count ?? conversations.length;
  const unreadCount = resolveSupportUnreadCount(data?.unread_count, data?.data);

  const selected = useMemo(() => {
    if (!selectedId) return undefined;
    return conversations.find((c) => c.id === selectedId);
  }, [conversations, selectedId]);

  const handleAssigneeChange = (assignee: SupportAssignee | null) => {
    if (!selectedId) return;
    setAssigneeOverrides((prev) => ({
      ...prev,
      [selectedId]: assignee,
    }));
  };

  const showDetail = Boolean(selectedId);

  return (
    <div className="-mx-4 -mb-4 min-w-0 rounded-b-lg border-t border-[var(--color-border)] sm:-mx-6 sm:-mb-6">
      <div className="flex h-[calc(100dvh-8rem)] min-h-[500px] min-w-0 flex-col overflow-hidden xl:flex-row xl:divide-x xl:divide-slate-200">
        <div
          className={cn(
            "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white xl:w-[320px] xl:max-w-[320px] xl:shrink-0",
            showDetail ? "hidden xl:flex" : "flex"
          )}
        >
          <div className="min-w-0 space-y-2.5 border-b border-slate-200 p-3 sm:p-4">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Inbox className="size-4 shrink-0 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-muted-foreground">
                  {inboxCount}
                </span>
                {unreadCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[11px] font-semibold text-white">
                    {unreadCount} unread
                  </span>
                ) : null}
                {isFetching && !isLoading ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : null}
              </div>
              <div className="shrink-0">
                <AdminInboxSortSelect
                  value={filters.sort}
                  onChange={(sort) => setFilters((prev) => ({ ...prev, sort }))}
                />
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 rounded-lg border-slate-200 bg-slate-50 pl-9 text-sm"
              />
            </div>
            <AdminSupportInboxFilters
              filters={filters}
              venues={venues}
              assignees={staffAssignees}
              onChange={setFilters}
              onClear={() => setFilters(DEFAULT_ADMIN_INBOX_FILTERS)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading conversations…
              </div>
            ) : isError ? (
              <div className="space-y-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Couldn’t load conversations.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No conversations match these filters.
              </div>
            ) : (
              conversations.map((conversation) => {
                return (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    assignee={getEffectiveAssignee(
                      conversation,
                      assigneeOverrides
                    )}
                    isSelected={
                      pathname === `/admin/support/inbox/${conversation.id}`
                    }
                    isPinned={conversation.isPinned}
                  />
                );
              })
            )}
          </div>
        </div>

        {selectedId ? (
          <ConversationDetail
            ticketKey={selectedId}
            fallback={selected}
            listAssignees={staffAssignees}
            assigneeOverrides={assigneeOverrides}
            onAssigneeChange={handleAssigneeChange}
          />
        ) : (
          <EmptyDetail />
        )}
      </div>
    </div>
  );
}
