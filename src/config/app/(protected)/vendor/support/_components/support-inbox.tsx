"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Inbox,
  Loader2,
  Mail,
  Pin,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriorityBadge, StatusBadge } from "./support-badges";
import VendorConversationHeader from "./vendor-conversation-header";
import VendorConversationSidebar from "./vendor-conversation-sidebar";
import VendorConversationThread from "./vendor-conversation-thread";
import AssignTicketDialog from "@/app/(protected)/_shared/support/assign-ticket-dialog";
import VendorSupportInboxFilters, {
  DEFAULT_VENDOR_INBOX_FILTERS,
  VendorInboxSortSelect,
  type VendorInboxFilters,
} from "./support-inbox-filters";
import {
  formatRelativeTime,
  isClosedTicketStatus,
  SUPPORT_STATUSES,
  VENDOR_DIRECTION_LABELS,
} from "../_lib/utils";
import type {
  SupportAssignee,
  SupportStatus,
  VendorSupportConversation,
} from "../_lib/types";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import {
  flattenVendorSupportMessages,
  mapVendorDirectionFromTicket,
  mapVendorInboxDateToApiTime,
  mapVendorSupportAssignee,
  mapVendorSupportStaff,
  mapVendorSupportTicketToConversation,
  mapVendorTicketDetailToConversation,
  getVendorMessagesPayload,
  toVendorApiDirection,
  useMarkVendorSupportMessagesRead,
  usePinVendorSupportTicket,
  useAssignVendorSupportTicket,
  useVendorSupportTicketMessagesInfinite,
  useVendorSupportTickets,
  type VendorSupportTicketsParams,
} from "@/services/vendor/support";
import { cn } from "@/lib/utils";
import { resolveSupportUnreadCount } from "@/app/(protected)/_shared/support/support-unread-count";

const CHAT_MESSAGES_PER_PAGE = 30;

function dedupeSortMessages<T extends { id: string; createdAt: string }>(
  messages: T[]
): T[] {
  const seen = new Set<string>();
  return messages
    .filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    })
    .sort(
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
  conversation: VendorSupportConversation;
  assignee: SupportAssignee | null;
  isSelected: boolean;
  isPinned: boolean;
}) {
  const contactName =
    conversation.lastSenderName || conversation.customer.name || "Unknown";
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Link
      href={`/vendor/support/inbox/${conversation.id}`}
      className={cn(
        "block border-b border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50",
        isSelected && "bg-[var(--color-primary)]/[0.06]",
        hasUnread &&
          !isSelected &&
          "border-l-[3px] border-l-[var(--color-primary)] bg-[var(--color-primary)]/[0.08]",
        hasUnread &&
          isSelected &&
          "border-l-[3px] border-l-[var(--color-primary)]"
      )}
    >
      <div className="flex gap-2">
        <div className="relative shrink-0">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-white",
              hasUnread
                ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {contactName.charAt(0).toUpperCase()}
          </div>
          {hasUnread && (
            <span
              className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[var(--color-primary)] ring-2 ring-white"
              aria-label={`${conversation.unreadCount} unread`}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <p
                className={cn(
                  "truncate text-xs text-foreground",
                  hasUnread ? "font-bold" : "font-semibold"
                )}
              >
                {contactName}
              </p>
              {hasUnread ? (
                <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
                  Unread
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isPinned && (
                <Pin className="size-2.5 fill-[var(--color-primary)] text-[var(--color-primary)]" />
              )}
              <span
                className={cn(
                  "text-[10px]",
                  hasUnread
                    ? "font-semibold text-[var(--color-primary)]"
                    : "text-muted-foreground"
                )}
              >
                {formatRelativeTime(conversation.lastMessageAt)}
              </span>
            </div>
          </div>
          <p
            className={cn(
              "mt-0.5 line-clamp-1 text-xs text-foreground",
              hasUnread ? "font-semibold" : "font-medium"
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
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none",
                conversation.direction === "sent"
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-emerald-50 text-emerald-700"
              )}
            >
              {VENDOR_DIRECTION_LABELS[conversation.direction]}
            </span>
            <StatusBadge
              status={conversation.status}
              label={conversation.statusLabel}
            />
            <PriorityBadge priority={conversation.priority} />
            {conversation.direction === "sent" ? (
              <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium leading-none text-slate-600">
                All staff
              </span>
            ) : assignee ? (
              <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium leading-none text-slate-600">
                <span className="truncate">{assignee.name.split(" ")[0]}</span>
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
  fallback?: VendorSupportConversation;
  listAssignees: SupportAssignee[];
  assigneeOverrides: Record<string, SupportAssignee | null>;
  onAssigneeChange: (assignee: SupportAssignee | null) => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const markedReadRef = useRef<string | null>(null);
  const markMessagesRead = useMarkVendorSupportMessagesRead();
  const pinTicket = usePinVendorSupportTicket();
  const assignTicket = useAssignVendorSupportTicket();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVendorSupportTicketMessagesInfinite(ticketKey, CHAT_MESSAGES_PER_PAGE);

  const latestPage = data?.pages?.[0];
  const latestPayload = useMemo(
    () => getVendorMessagesPayload(latestPage),
    [latestPage]
  );

  const direction = useMemo(() => {
    if (latestPayload.ticket) {
      return mapVendorDirectionFromTicket(latestPayload.ticket);
    }
    return fallback?.direction ?? "received";
  }, [latestPayload.ticket, fallback?.direction]);

  const messages = useMemo(() => {
    const pages = data?.pages ?? [];
    const flat = pages.flatMap((page) => {
      const payload = getVendorMessagesPayload(page);
      return flattenVendorSupportMessages(payload.messages, direction);
    });
    return dedupeSortMessages(flat);
  }, [data?.pages, direction]);

  const conversation = useMemo(() => {
    if (latestPayload.ticket) {
      const mapped = mapVendorTicketDetailToConversation(
        latestPayload.ticket,
        messages,
        latestPayload.customer,
        latestPayload.assignee
      );
      // Only borrow list assignee when messages omitted the field entirely.
      // Explicit `assignee: null` means Unassigned — do not resurrect list value.
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
  const [composerUnlocked, setComposerUnlocked] = useState(false);

  useEffect(() => {
    setComposerUnlocked(false);
  }, [ticketKey]);

  useEffect(() => {
    if (conversation?.status) {
      setStatus(conversation.status);
    }
  }, [ticketKey, conversation?.status]);

  useEffect(() => {
    // Mark read from tickets-list unread state as soon as a thread is opened.
    // Do not wait for the messages API.
    if (!ticketKey || markedReadRef.current === ticketKey) return;
    markedReadRef.current = ticketKey;
    markMessagesRead.mutate(ticketKey);
  }, [ticketKey, markMessagesRead]);

  const staffAssignees = useMemo(() => {
    const fromDetail = mapVendorSupportStaff(latestPayload.staff ?? []);
    return fromDetail.length > 0 ? fromDetail : listAssignees;
  }, [latestPayload.staff, listAssignees]);

  const assignee = useMemo(() => {
    if (ticketKey in assigneeOverrides) {
      return assigneeOverrides[ticketKey] ?? null;
    }
    // Messages API sent assignee (including null) — trust it
    if (latestPayload.assignee !== undefined) {
      return mapVendorSupportAssignee(latestPayload.assignee);
    }
    return conversation?.assignee ?? fallback?.assignee ?? null;
  }, [
    conversation?.assignee,
    fallback?.assignee,
    ticketKey,
    assigneeOverrides,
    latestPayload.assignee,
  ]);

  const isPinned =
    conversation?.isPinned ?? fallback?.isPinned ?? false;

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

  const isSentToAdmin = conversation.direction === "sent";
  const isCustomerTicket = conversation.direction === "received";
  // Wait for messages payload — can_* are undefined while loading and must not
  // default-open action buttons (e.g. Close flashed for admin tickets).
  const permissionsReady = Boolean(latestPage);
  const canReply = permissionsReady && latestPayload.can_reply === true;
  const isClosed = isClosedTicketStatus(status);
  const showReopenButtons =
    isSentToAdmin && isClosed && canReply && !composerUnlocked;
  const showComposer = canReply && (!isClosed || composerUnlocked);
  const showClosedReadOnly = isClosed && !canReply;
  const isComposerDisabled = !permissionsReady || !showComposer;
  const canManage =
    permissionsReady && latestPayload.can_manage !== false;
  const canPin = permissionsReady && latestPayload.can_pin !== false;
  const canAssign = canManage && !isSentToAdmin && !assignee;

  const handleReopenClick = () => {
    setComposerUnlocked(true);
  };

  const handleMessageSent = () => {
    setComposerUnlocked(false);
  };

  let composerDisabledMessage = "Replies are disabled for this ticket.";
  if (showClosedReadOnly && isCustomerTicket) {
    composerDisabledMessage =
      "This ticket is closed. Only the customer can reopen it by replying.";
  } else if (showClosedReadOnly) {
    composerDisabledMessage = "This ticket is closed.";
  } else if (status === "waiting_platform_support") {
    composerDisabledMessage =
      "This ticket was transferred to platform support.";
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden 2xl:flex-row">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <Link
          href="/vendor/support/inbox"
          className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-slate-50 xl:hidden"
        >
          <ArrowLeft className="size-4" />
          Back to inbox
        </Link>
        <div className="min-w-0 shrink-0">
          <VendorConversationHeader
            conversation={conversation}
            status={status}
            onStatusChange={setStatus}
            assignee={assignee}
            isPinned={isPinned}
            onTogglePin={canPin ? handleTogglePin : () => undefined}
            canPin={canPin}
            canManage={canManage}
            onAssignClick={() => setAssignOpen(true)}
            onReopen={showReopenButtons ? handleReopenClick : undefined}
          />
        </div>
        {isLoading && messages.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading messages…
          </div>
        ) : (
          <VendorConversationThread
            ticketKey={ticketKey}
            messages={messages}
            isComposerDisabled={isComposerDisabled}
            disabledMessage={composerDisabledMessage}
            onReopen={showReopenButtons ? handleReopenClick : undefined}
            showReopenHint={showComposer && composerUnlocked && isClosed}
            onMessageSent={handleMessageSent}
            hasMore={Boolean(hasNextPage)}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={() => {
              if (hasNextPage && !isFetchingNextPage) {
                void fetchNextPage();
              }
            }}
          />
        )}
        {canAssign ? (
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
        <VendorConversationSidebar
          ticketKey={ticketKey}
          assignee={assignee}
          onAssignClick={canAssign ? () => setAssignOpen(true) : undefined}
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
        Pick a thread on the left to view the full history and reply to
        customers.
      </p>
    </div>
  );
}

interface VendorSupportInboxProps {
  selectedId?: string;
}

function getInitialFilters(searchParams: URLSearchParams): VendorInboxFilters {
  const status = searchParams.get("status");
  if (status && SUPPORT_STATUSES.includes(status as SupportStatus)) {
    return { ...DEFAULT_VENDOR_INBOX_FILTERS, status: status as SupportStatus };
  }
  return DEFAULT_VENDOR_INBOX_FILTERS;
}

function buildTicketsParams(
  filters: VendorInboxFilters,
  search: string
): VendorSupportTicketsParams {
  const params: VendorSupportTicketsParams = {
    sort: filters.sort,
    time: mapVendorInboxDateToApiTime(filters.date),
  };

  const q = search.trim();
  if (q) params.search = q;

  if (filters.status !== "all") params.status = filters.status;
  if (filters.priority !== "all") params.priority = filters.priority;

  if (filters.direction === "all") {
    params.direction = "all";
  } else {
    params.direction = toVendorApiDirection(filters.direction);
  }

  const quickFilters = [...filters.quickFilters];

  if (filters.assignee === "unassigned") {
    if (!quickFilters.includes("unassigned_only")) {
      quickFilters.push("unassigned_only");
    }
  } else if (filters.assignee !== "all") {
    params.assignee = filters.assignee;
    params.assign_to = filters.assignee;
  }

  if (quickFilters.length > 0) {
    params.filter = quickFilters;
  }

  return params;
}

function getEffectiveAssignee(
  conversation: VendorSupportConversation,
  overrides: Record<string, SupportAssignee | null | undefined>
): SupportAssignee | null {
  if (conversation.id in overrides) {
    return overrides[conversation.id] ?? null;
  }
  return conversation.assignee;
}

export default function VendorSupportInbox({
  selectedId,
}: VendorSupportInboxProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [filters, setFilters] = useState<VendorInboxFilters>(() =>
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
    useVendorSupportTickets(ticketsParams);

  const conversations = useMemo(
    () => (data?.data ?? []).map(mapVendorSupportTicketToConversation),
    [data?.data]
  );

  const staffAssignees = useMemo(
    () => mapVendorSupportStaff(data?.staff ?? []),
    [data?.staff]
  );

  const filterAssignees = useMemo(
    () => [{ id: "unassigned", name: "Unassigned" }, ...staffAssignees],
    [staffAssignees]
  );

  const inboxCount = data?.inbox_count ?? data?.meta.total ?? conversations.length;
  const unreadCount = resolveSupportUnreadCount(data?.unread_count, data?.data);

  const selectedFallback = useMemo(() => {
    if (!selectedId) return undefined;
    return conversations.find((c) => c.id === selectedId);
  }, [selectedId, conversations]);

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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Inbox className="size-4 text-[var(--color-primary)]" />
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
              <VendorInboxSortSelect
                value={filters.sort}
                onChange={(sort) => setFilters((prev) => ({ ...prev, sort }))}
              />
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
            <VendorSupportInboxFilters
              filters={filters}
              assignees={filterAssignees}
              onChange={setFilters}
              onClear={() => setFilters(DEFAULT_VENDOR_INBOX_FILTERS)}
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
                  Couldn’t load support tickets.
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
              <p className="p-6 text-center text-sm text-muted-foreground">
                No conversations found.
              </p>
            ) : (
              conversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  assignee={getEffectiveAssignee(
                    conversation,
                    assigneeOverrides
                  )}
                  isSelected={
                    pathname === `/vendor/support/inbox/${conversation.id}`
                  }
                  isPinned={conversation.isPinned}
                />
              ))
            )}
          </div>
        </div>

        {selectedId ? (
          <ConversationDetail
            ticketKey={selectedId}
            fallback={selectedFallback}
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
