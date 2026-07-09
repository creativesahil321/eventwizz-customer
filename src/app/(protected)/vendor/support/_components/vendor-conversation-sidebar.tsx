"use client";

import Link from "next/link";
import { Calendar, Mail, Phone, User } from "lucide-react";
import { StatusBadge } from "./support-badges";
import {
  VENDOR_BOOKING_DETAILS,
  VENDOR_CONVERSATIONS,
} from "../_lib/mock-data";
import type { VendorSupportConversation } from "../_lib/types";

interface VendorConversationSidebarProps {
  conversation: VendorSupportConversation;
}

export default function VendorConversationSidebar({
  conversation,
}: VendorConversationSidebarProps) {
  const { customer } = conversation;
  const booking =
    conversation.bookingRef &&
    VENDOR_BOOKING_DETAILS[conversation.bookingRef];

  const recentTickets = VENDOR_CONVERSATIONS.filter(
    (c) => c.id !== conversation.id && c.customer.email === customer.email
  ).slice(0, 3);

  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col gap-5 border-t border-slate-200 bg-slate-50/50 p-4 lg:max-h-none xl:w-[280px] xl:border-l xl:border-t-0 xl:p-5">
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Customer
        </h3>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-semibold text-[var(--color-primary)]">
            {customer.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {customer.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {customer.email}
            </p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="size-3.5 shrink-0" />
            <span className="break-all">{customer.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="size-3.5 shrink-0" />
            <span className="break-words">{customer.timezone}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            <span>Customer since {customer.customerSince}</span>
          </div>
        </dl>
      </section>

      {booking && (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Booking
          </h3>
          <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">
              {booking.title}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="size-3.5" />
              {booking.date}
            </div>
            <p className="mt-3 text-base font-bold text-foreground">
              {booking.price}
            </p>
          </div>
        </section>
      )}

      {conversation.assignee && (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assignee
          </h3>
          <p className="mt-2 text-sm font-medium text-foreground">
            {conversation.assignee.name}
          </p>
        </section>
      )}

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent tickets
        </h3>
        <ul className="mt-3 space-y-2">
          {recentTickets.length === 0 ? (
            <li className="text-xs text-muted-foreground">No other tickets.</li>
          ) : (
            recentTickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/vendor/support/inbox/${ticket.id}`}
                  className="block rounded-lg border border-transparent p-2.5 transition-colors hover:border-[var(--color-border)] hover:bg-white"
                >
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {ticket.subject}
                  </p>
                  <div className="mt-1.5">
                    <StatusBadge status={ticket.status} />
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
