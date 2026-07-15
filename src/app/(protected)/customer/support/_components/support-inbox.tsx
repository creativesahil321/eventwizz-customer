"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Inbox,
  Loader2,
  Mail,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriorityBadge, StatusBadge } from "./support-badges";
import SupportConversationSidebar from "./support-conversation-sidebar";
import SupportConversationThread from "./support-conversation-thread";
import SupportInboxFilters, {
  DEFAULT_INBOX_FILTERS,
  InboxSortSelect,
  type InboxFilters,
} from "./support-inbox-filters";
import {
  flattenCustomerSupportMessages,
  mapCustomerSupportTicketToConversation,
  mapInboxDateToApiTime,
  mapTicketDetailToConversation,
  getCustomerMessagesPayload,
  useCustomerSupportTicketMessagesInfinite,
  useCustomerSupportTickets,
  useMarkCustomerSupportMessagesRead,
  type CustomerSupportTicketsParams,
} from "@/services/customer/support";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import {
  CATEGORY_LABELS,
  formatRelativeTime,
  isClosedTicketStatus,
  SUPPORT_STATUSES,
} from "../_lib/utils";
import type { SupportConversation, SupportStatus } from "../_lib/types";
import { cn } from "@/lib/utils";

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
  isSelected,
}: {
  conversation: SupportConversation;
  isSelected: boolean;
}) {
  const lastAgent = [...conversation.messages]
    .reverse()
    .find((m) => m.sender === "agent");

  const contactName =
    conversation.lastSenderName ?? lastAgent?.senderName ?? "Support";
  const hasUnread = conversation.unreadCount > 0;
  const preview =
    lastAgent && !conversation.lastSenderName
      ? `${lastAgent.senderName}: ${conversation.lastMessage}`
      : conversation.lastMessage;

  return (
    <Link
      href={`/customer/support/inbox/${conversation.id}`}
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
            {preview}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <StatusBadge
              status={conversation.status}
              label={conversation.statusLabel}
            />
            <PriorityBadge priority={conversation.priority} />
            <span className="ml-auto text-[10px] font-medium text-muted-foreground">
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
}: {
  ticketKey: string;
  fallback?: SupportConversation;
}) {
  const markedReadRef = useRef<string | null>(null);
  const markMessagesRead = useMarkCustomerSupportMessagesRead();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCustomerSupportTicketMessagesInfinite(
    ticketKey,
    CHAT_MESSAGES_PER_PAGE
  );

  const latestPage = data?.pages?.[0];
  const latestPayload = useMemo(
    () => getCustomerMessagesPayload(latestPage),
    [latestPage]
  );

  const messages = useMemo(() => {
    const pages = data?.pages ?? [];
    const flat = pages.flatMap((page) => {
      const payload = getCustomerMessagesPayload(page);
      return flattenCustomerSupportMessages(payload.messages);
    });
    return dedupeSortMessages(flat);
  }, [data?.pages]);

  const conversation = useMemo(() => {
    if (latestPayload.ticket) {
      return mapTicketDetailToConversation(latestPayload.ticket, messages);
    }
    if (fallback) {
      return { ...fallback, messages };
    }
    return null;
  }, [latestPayload.ticket, fallback, messages]);

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

  // Mark read from tickets-list unread state as soon as a thread is opened.
  // Do not wait for the messages API.
  useEffect(() => {
    if (!ticketKey || markedReadRef.current === ticketKey) return;
    markedReadRef.current = ticketKey;
    markMessagesRead.mutate(ticketKey);
  }, [ticketKey, markMessagesRead]);

  const isClosed = isClosedTicketStatus(status);
  const showReopenButtons = isClosed && !composerUnlocked;
  const showComposer = !isClosed || composerUnlocked;

  const handleReopenClick = () => {
    setComposerUnlocked(true);
  };

  const handleMessageSent = () => {
    setComposerUnlocked(false);
  };

  if (isLoading && !conversation) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-white p-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Loading conversation…</p>
      </div>
    );
  }

  if (isError && !conversation) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-white p-8">
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

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <Link
        href="/customer/support/inbox"
        className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-slate-50 xl:hidden"
      >
        <ArrowLeft className="size-4" />
        Back to inbox
      </Link>
      <div className="min-w-0 shrink-0 border-b border-slate-200 bg-white px-3 py-1.5 sm:px-5 sm:py-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">
                {conversation.ref}
              </span>
              <StatusBadge
                status={status}
                label={conversation.statusLabel}
              />
              <PriorityBadge priority={conversation.priority} />
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {CATEGORY_LABELS[conversation.category]}
              </span>
            </div>
            <h2 className="mt-0.5 max-w-full text-sm font-semibold leading-snug break-words [overflow-wrap:anywhere] text-foreground sm:text-base">
              {conversation.subject}
            </h2>
            {conversation.bookingTitle || conversation.bookingRef ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Booking:{" "}
                {[conversation.bookingRef, conversation.bookingTitle]
                  .filter(Boolean)
                  .join(" — ")}
              </p>
            ) : null}
          </div>
          {showReopenButtons ? (
            <Button
              type="button"
              variant="event-primary"
              size="sm"
              className="h-8 shrink-0 rounded-full px-3"
              onClick={handleReopenClick}
            >
              <RotateCcw className="size-4 shrink-0" />
              Reopen
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading && messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading messages…
        </div>
      ) : (
        <SupportConversationThread
          ticketKey={ticketKey}
          messages={messages}
          isComposerDisabled={!showComposer}
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
        Pick a thread on the left to view the full history, attachments, and
        reply inline.
      </p>
    </div>
  );
}

interface SupportInboxProps {
  selectedId?: string;
}

function getInitialFilters(searchParams: URLSearchParams): InboxFilters {
  const status = searchParams.get("status");
  if (status && SUPPORT_STATUSES.includes(status as SupportStatus)) {
    return { ...DEFAULT_INBOX_FILTERS, status: status as SupportStatus };
  }
  return DEFAULT_INBOX_FILTERS;
}

function buildTicketsParams(
  filters: InboxFilters,
  search: string
): CustomerSupportTicketsParams {
  const params: CustomerSupportTicketsParams = {
    sort: filters.sort,
  };

  const q = search.trim();
  if (q) params.search = q;

  if (filters.status !== "all") params.status = filters.status;
  if (filters.priority !== "all") params.priority = filters.priority;
  if (filters.category !== "all") params.category = filters.category;

  const time = mapInboxDateToApiTime(filters.date);
  if (time) params.time = time;

  return params;
}

export default function SupportInbox({ selectedId }: SupportInboxProps) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [filters, setFilters] = useState<InboxFilters>(() =>
    getInitialFilters(searchParams)
  );
  const pathname = usePathname();

  const ticketsParams = useMemo(
    () => buildTicketsParams(filters, debouncedSearch),
    [filters, debouncedSearch]
  );

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useCustomerSupportTickets(ticketsParams);

  const conversations = useMemo(
    () => (data?.data ?? []).map(mapCustomerSupportTicketToConversation),
    [data?.data]
  );

  const inboxCount = data?.inbox_count ?? data?.meta.total ?? conversations.length;

  const selected = useMemo(() => {
    if (!selectedId) return undefined;
    return conversations.find((c) => c.id === selectedId);
  }, [selectedId, conversations]);

  const showDetail = Boolean(selectedId);

  return (
    <div className="-mx-4 -mb-4 min-w-0 overflow-x-hidden rounded-b-lg border-t border-[var(--color-border)] sm:-mx-6 sm:-mb-6">
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
                {isFetching && !isLoading ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : null}
              </div>
              <InboxSortSelect
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
            <SupportInboxFilters
              filters={filters}
              onChange={setFilters}
              onClear={() => setFilters(DEFAULT_INBOX_FILTERS)}
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
                  isSelected={
                    pathname === `/customer/support/inbox/${conversation.id}`
                  }
                />
              ))
            )}
          </div>
        </div>

        {selectedId ? (
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden 2xl:flex-row 2xl:divide-x 2xl:divide-slate-200">
            <ConversationDetail
              ticketKey={selectedId}
              fallback={selected}
            />
            <div className="hidden h-full min-h-0 w-[260px] shrink-0 overflow-y-auto 2xl:block">
              <SupportConversationSidebar ticketKey={selectedId} />
            </div>
          </div>
        ) : (
          <EmptyDetail />
        )}
      </div>
    </div>
  );
}
