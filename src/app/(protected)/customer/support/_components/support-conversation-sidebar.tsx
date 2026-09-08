"use client";

import Link from "next/link";
import { Calendar, Loader2, MapPin, Phone, User } from "lucide-react";
import { StatusBadge } from "./support-badges";
import {
  mapRecentTicketToConversation,
  getCustomerMessagesPayload,
  useCustomerSupportTicketMessages,
} from "@/services/customer/support";

interface SupportConversationSidebarProps {
  ticketKey: string;
}

export default function SupportConversationSidebar({
  ticketKey,
}: SupportConversationSidebarProps) {
  const { data, isLoading } = useCustomerSupportTicketMessages(ticketKey, {
    page: 1,
    per_page: 30,
  });

  const payload = getCustomerMessagesPayload(data);
  const customer = payload.customer;
  const booking = payload.ticket?.booking;
  const recentTickets = (payload.recent_tickets ?? []).map(
    mapRecentTicketToConversation
  );

  const bookingTitle =
    (typeof booking?.event_name === "string" && booking.event_name) ||
    (typeof booking?.title === "string" && booking.title) ||
    null;
  const bookingRef =
    (typeof booking?.booking_number === "string" && booking.booking_number) ||
    (booking?.booking_id != null ? String(booking.booking_id) : null) ||
    (booking?.id != null ? String(booking.id) : null);
  const bookingDate =
    (typeof booking?.event_date === "string" && booking.event_date) ||
    (typeof booking?.date === "string" && booking.date) ||
    null;
  const locationName =
    typeof booking?.location_name === "string" && booking.location_name.trim()
      ? booking.location_name.trim()
      : null;
  const hasBookingDetails = Boolean(
    bookingTitle || bookingRef || bookingDate || locationName
  );

  const initials =
    customer?.full_name?.charAt(0).toUpperCase() ||
    customer?.email?.charAt(0).toUpperCase() ||
    "Y";

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 border-t border-slate-200 bg-slate-50/50 p-4 xl:w-[280px] xl:border-l xl:border-t-0 xl:p-5">
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Your details
        </h3>
        {isLoading && !customer ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-semibold text-[var(--color-primary)]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {customer?.full_name || "You"}
                </p>
                {customer?.email ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {customer.email}
                  </p>
                ) : null}
              </div>
            </div>
            {customer?.phone ? (
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  <span className="break-all">{customer.phone}</span>
                </div>
              </dl>
            ) : null}
          </>
        )}
      </section>

      {booking && hasBookingDetails ? (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Booking
          </h3>
          <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            {bookingTitle ? (
              <p className="text-sm font-semibold text-foreground">
                {bookingTitle}
              </p>
            ) : null}
            {bookingRef || bookingDate ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" />
                <span>
                  {[bookingRef, bookingDate].filter(Boolean).join(" · ")}
                </span>
              </div>
            ) : null}
            {locationName ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                <span className="break-words">{locationName}</span>
              </div>
            ) : null}
            {!bookingTitle && !bookingRef && !bookingDate && !locationName ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <User className="size-3.5" />
                Linked booking
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent enquiries
        </h3>
        {recentTickets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No other enquiries.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentTickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/customer/support/inbox/${ticket.id}`}
                  className="block rounded-lg border border-transparent p-2.5 transition-colors hover:border-[var(--color-border)] hover:bg-white"
                >
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {ticket.subject}
                  </p>
                  <div className="mt-1.5">
                    <StatusBadge
                      status={ticket.status}
                      label={ticket.statusLabel}
                      reopened={ticket.reopened}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
