"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Inbox, Mail, Pin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PriorityBadge, StatusBadge } from "./support-badges";
import VendorConversationHeader from "./vendor-conversation-header";
import VendorConversationSidebar from "./vendor-conversation-sidebar";
import VendorConversationThread from "./vendor-conversation-thread";
import VendorSupportInboxFilters, {
  DEFAULT_VENDOR_INBOX_FILTERS,
  VendorInboxSortSelect,
  matchesDateFilter,
  type VendorInboxFilters,
} from "./support-inbox-filters";
import {
  getVendorConversationById,
  getVendorInboxConversations,
} from "../_lib/mock-data";
import {
  formatRelativeTime,
  isClosedTicketStatus,
  SUPPORT_STATUSES,
} from "../_lib/utils";
import type { SupportStatus, VendorSupportConversation } from "../_lib/types";
import { cn } from "@/lib/utils";

function ConversationListItem({
  conversation,
  isSelected,
  isPinned,
}: {
  conversation: VendorSupportConversation;
  isSelected: boolean;
  isPinned: boolean;
}) {
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Link
      href={`/vendor/support/inbox/${conversation.id}`}
      className={cn(
        "block border-b border-slate-200 px-4 py-4 transition-colors hover:bg-slate-50",
        isSelected && "bg-[var(--color-primary)]/[0.04]",
        hasUnread && !isSelected && "bg-[var(--color-primary)]/[0.02]"
      )}
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {conversation.customer.name.charAt(0)}
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
              {conversation.customer.name}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              {isPinned && (
                <Pin className="size-3 fill-[var(--color-primary)] text-[var(--color-primary)]" />
              )}
              <span className="text-[11px] text-muted-foreground">
                {formatRelativeTime(conversation.lastMessageAt)}
              </span>
            </div>
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
            {conversation.lastMessage}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pb-0.5">
            <StatusBadge status={conversation.status} />
            <PriorityBadge priority={conversation.priority} />
            {conversation.assignee && (
              <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium leading-none text-slate-600">
                <span className="truncate">
                  {conversation.assignee.name.split(" ")[0]}
                </span>
              </span>
            )}
            <span className="ml-auto shrink-0 text-[11px] font-medium text-muted-foreground">
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
  isPinned,
  onTogglePin,
}: {
  conversation: VendorSupportConversation;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const [status, setStatus] = useState<SupportStatus>(conversation.status);

  useEffect(() => {
    setStatus(conversation.status);
  }, [conversation.id, conversation.status]);

  const isComposerDisabled = isClosedTicketStatus(status);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white lg:min-h-[640px]">
      <Link
        href="/vendor/support/inbox"
        className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-slate-50 lg:hidden"
      >
        <ArrowLeft className="size-4" />
        Back to inbox
      </Link>
      <VendorConversationHeader
        conversation={conversation}
        status={status}
        onStatusChange={setStatus}
        isPinned={isPinned}
        onTogglePin={onTogglePin}
      />
      <VendorConversationThread
        messages={conversation.messages}
        isComposerDisabled={isComposerDisabled}
      />
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

function matchesAssigneeFilter(
  conversation: VendorSupportConversation,
  assignee: VendorInboxFilters["assignee"]
): boolean {
  if (assignee === "all") return true;
  if (assignee === "unassigned") return !conversation.assignee;
  return conversation.assignee?.id === assignee;
}

export default function VendorSupportInbox({ selectedId }: VendorSupportInboxProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<VendorInboxFilters>(() =>
    getInitialFilters(searchParams)
  );
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    getVendorInboxConversations()
      .filter((c) => c.isPinned)
      .forEach((c) => initial.add(c.id));
    return initial;
  });

  const conversations = useMemo(() => getVendorInboxConversations(), []);

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = conversations.filter((c) => {
      if (filters.status !== "all" && c.status !== filters.status) return false;
      if (filters.priority !== "all" && c.priority !== filters.priority)
        return false;
      if (!matchesAssigneeFilter(c, filters.assignee)) return false;
      if (filters.category !== "all" && c.category !== filters.category)
        return false;
      if (!matchesDateFilter(c.lastMessageAt, filters.date)) return false;
      if (q) {
        const matchesSearch =
          c.subject.toLowerCase().includes(q) ||
          c.ref.toLowerCase().includes(q) ||
          c.customer.name.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

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
  }, [conversations, search, filters, pinnedIds]);

  const selected = selectedId ? getVendorConversationById(selectedId) : undefined;

  return (
    <div className="-mx-4 -mb-4 min-w-0 rounded-b-lg border-t border-[var(--color-border)] sm:-mx-6 sm:-mb-6">
      <div className="flex min-h-[min(70dvh,640px)] min-w-0 flex-col overflow-hidden lg:min-h-[640px] lg:flex-row lg:divide-x lg:divide-slate-200">
        <div
          className={cn(
            "flex w-full min-w-0 flex-col bg-white lg:max-w-[400px] lg:shrink-0",
            selected ? "hidden lg:flex" : "flex min-h-[min(70dvh,560px)]"
          )}
        >
          <div className="min-w-0 space-y-3 border-b border-slate-200 p-3 pb-4 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Inbox className="size-4 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-muted-foreground">
                  {filtered.length}
                </span>
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
              onChange={setFilters}
              onClear={() => setFilters(DEFAULT_VENDOR_INBOX_FILTERS)}
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
                    pathname === `/vendor/support/inbox/${conversation.id}`
                  }
                  isPinned={pinnedIds.has(conversation.id)}
                />
              ))
            )}
          </div>
        </div>

        {selected ? (
          <div className="flex min-h-[min(70dvh,640px)] min-w-0 flex-1 flex-col xl:min-h-[640px] xl:flex-row xl:divide-x xl:divide-slate-200">
            <ConversationDetail
              conversation={selected}
              isPinned={pinnedIds.has(selected.id)}
              onTogglePin={() => togglePin(selected.id)}
            />
            <VendorConversationSidebar conversation={selected} />
          </div>
        ) : (
          <EmptyDetail />
        )}
      </div>
    </div>
  );
}
