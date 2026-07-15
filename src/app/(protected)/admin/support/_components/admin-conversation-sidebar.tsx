"use client";

import Link from "next/link";
import { Building2, Calendar, Mail, Phone, User } from "lucide-react";
import { SourceBadge, StatusBadge } from "./support-badges";
import type { AdminSupportConversation, SupportStatus } from "../_lib/types";

export interface AdminRecentTicketItem {
  id: string;
  subject: string;
  status: SupportStatus;
  statusLabel?: string;
}

interface AdminConversationSidebarProps {
  conversation: AdminSupportConversation;
  assignee: AdminSupportConversation["assignee"];
  onAssignClick?: () => void;
  recentTickets?: AdminRecentTicketItem[];
  isLoadingRecent?: boolean;
}

export default function AdminConversationSidebar({
  conversation,
  assignee,
  onAssignClick,
  recentTickets = [],
  isLoadingRecent = false,
}: AdminConversationSidebarProps) {
  const { contact, venue } = conversation;
  const hasBooking = Boolean(
    conversation.bookingRef || conversation.bookingTitle
  );

  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col gap-5 border-t border-slate-200 bg-slate-50/50 p-4 lg:max-h-none xl:w-[280px] xl:border-l xl:border-t-0 xl:p-5">
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Venue
        </h3>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-sm">
          <Building2 className="size-4 shrink-0 text-[var(--color-primary)]" />
          <p className="text-sm font-semibold text-foreground">{venue.name}</p>
        </div>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Contact
        </h3>
        <div className="mt-2">
          <SourceBadge source={conversation.source} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-semibold text-[var(--color-primary)]">
            {contact.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {contact.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {contact.email}
            </p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-xs">
          {contact.role ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="size-3.5 shrink-0" />
              <span>{contact.role}</span>
            </div>
          ) : null}
          {contact.phone ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-3.5 shrink-0" />
              <span className="break-all">{contact.phone}</span>
            </div>
          ) : null}
          {contact.email ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-3.5 shrink-0" />
              <span className="break-all">{contact.email}</span>
            </div>
          ) : null}
        </dl>
      </section>

      {hasBooking ? (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Booking
          </h3>
          <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            {conversation.bookingTitle ? (
              <p className="text-sm font-semibold text-foreground">
                {conversation.bookingTitle}
              </p>
            ) : null}
            {conversation.bookingRef ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                <span>{conversation.bookingRef}</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <User className="size-3.5" />
                Linked booking
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Assignee
        </h3>
        {assignee ? (
          <p className="mt-2 text-sm font-medium text-foreground">
            {assignee.name}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Unassigned</p>
        )}
        {onAssignClick ? (
          <button
            type="button"
            onClick={onAssignClick}
            className="mt-2 text-xs font-medium text-[var(--color-primary)] hover:underline"
          >
            {assignee ? "Change assignee" : "Assign to staff"}
          </button>
        ) : null}
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent tickets
        </h3>
        <ul className="mt-3 space-y-2">
          {isLoadingRecent && recentTickets.length === 0 ? (
            <li className="text-xs text-muted-foreground">Loading…</li>
          ) : recentTickets.length === 0 ? (
            <li className="text-xs text-muted-foreground">No other tickets.</li>
          ) : (
            recentTickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/admin/support/inbox/${ticket.id}`}
                  className="block rounded-lg border border-transparent p-2.5 transition-colors hover:border-[var(--color-border)] hover:bg-white"
                >
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {ticket.subject}
                  </p>
                  <div className="mt-1.5">
                    <StatusBadge
                      status={ticket.status}
                      label={ticket.statusLabel}
                    />
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </aside>
  );
}
