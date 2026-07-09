"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Inbox,
  Mail,
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
  matchesDateFilter,
  type InboxFilters,
} from "./support-inbox-filters";
import {
  getConversationById,
  getInboxConversations,
} from "../_lib/mock-data";
import {
  CATEGORY_LABELS,
  formatRelativeTime,
  isClosedTicketStatus,
  SUPPORT_STATUSES,
} from "../_lib/utils";
import type { SupportConversation, SupportStatus } from "../_lib/types";
import { cn } from "@/lib/utils";

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

  const contactName = lastAgent?.senderName ?? "Support";
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Link
      href={`/customer/support/inbox/${conversation.id}`}
      className={cn(
        "block border-b border-slate-200 px-4 py-4 transition-colors hover:bg-slate-50",
        isSelected && "bg-[var(--color-primary)]/[0.04]",
        hasUnread && !isSelected && "bg-[var(--color-primary)]/[0.02]"
      )}
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {contactName.charAt(0).toUpperCase()}
          </div>
          {hasUnread && (
            <span
              className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--color-primary)] ring-2 ring-white"
              aria-label={`${conversation.unreadCount} unread`}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm text-foreground",
                hasUnread ? "font-bold" : "font-semibold"
              )}
            >
              {contactName}
            </p>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          </div>
          <p
            className={cn(
              "mt-0.5 line-clamp-1 text-sm text-foreground",
              hasUnread ? "font-semibold" : "font-medium"
            )}
          >
            {conversation.subject}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {lastAgent
              ? `${lastAgent.senderName}: ${conversation.lastMessage}`
              : conversation.lastMessage}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={conversation.status} />
            <PriorityBadge priority={conversation.priority} />
            <span className="ml-auto text-[11px] font-medium text-muted-foreground">
              {conversation.ref}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ConversationDetail({
  conversation,
}: {
  conversation: SupportConversation;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white lg:min-h-[640px]">
      <Link
        href="/customer/support/inbox"
        className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-slate-50 lg:hidden"
      >
        <ArrowLeft className="size-4" />
        Back to inbox
      </Link>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            {conversation.ref}
          </span>
          <StatusBadge status={conversation.status} />
          <PriorityBadge priority={conversation.priority} />
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {CATEGORY_LABELS[conversation.category]}
          </span>
        </div>
        <h2 className="mt-2 text-lg font-semibold leading-snug text-foreground">
          {conversation.subject}
        </h2>
        {conversation.bookingTitle && (
          <p className="mt-1 text-sm text-muted-foreground">
            Booking: {conversation.bookingRef} — {conversation.bookingTitle}
          </p>
        )}
      </div>

      <SupportConversationThread messages={conversation.messages} />
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="hidden min-h-[640px] flex-1 flex-col items-center justify-center bg-slate-50/30 p-8 text-center lg:flex">
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

function matchesStatusFilter(
  status: SupportConversation["status"],
  filter: InboxFilters["status"]
): boolean {
  if (filter === "all") return true;
  return status === filter;
}

export default function SupportInbox({ selectedId }: SupportInboxProps) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<InboxFilters>(() =>
    getInitialFilters(searchParams)
  );
  const pathname = usePathname();
  const conversations = useMemo(() => getInboxConversations(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = conversations.filter((c) => {
      if (!matchesStatusFilter(c.status, filters.status)) return false;
      if (filters.priority !== "all" && c.priority !== filters.priority)
        return false;
      if (filters.category !== "all" && c.category !== filters.category)
        return false;
      if (!matchesDateFilter(c.lastMessageAt, filters.date)) return false;
      if (q) {
        const matchesSearch =
          c.subject.toLowerCase().includes(q) ||
          c.ref.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (filters.status === "all") {
        const aClosed = isClosedTicketStatus(a.status);
        const bClosed = isClosedTicketStatus(b.status);
        if (aClosed !== bClosed) return aClosed ? 1 : -1;
      }

      const aTime = new Date(a.lastMessageAt).getTime();
      const bTime = new Date(b.lastMessageAt).getTime();
      return filters.sort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [conversations, search, filters]);

  const selected = selectedId ? getConversationById(selectedId) : undefined;

  return (
    <div className="-mx-4 -mb-4 overflow-x-hidden rounded-b-lg border-t border-[var(--color-border)] sm:-mx-6 sm:-mb-6">
      <div className="flex min-h-[min(70dvh,640px)] flex-col lg:min-h-[640px] lg:flex-row lg:divide-x lg:divide-slate-200">
        <div
          className={cn(
            "flex w-full flex-col bg-white lg:max-w-[400px] lg:shrink-0",
            selected ? "hidden lg:flex" : "flex min-h-[min(70dvh,560px)]"
          )}
        >
          <div className="space-y-3 border-b border-slate-200 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Inbox className="size-4 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
                <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-muted-foreground">
                  {filtered.length}
                </span>
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
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No conversations found.
              </p>
            ) : (
              filtered.map((conversation) => (
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

        {selected ? (
          <div className="flex min-h-[min(70dvh,640px)] flex-1 flex-col xl:min-h-[640px] xl:flex-row xl:divide-x xl:divide-slate-200">
            <ConversationDetail conversation={selected} />
            <SupportConversationSidebar conversation={selected} />
          </div>
        ) : (
          <EmptyDetail />
        )}
      </div>
    </div>
  );
}
