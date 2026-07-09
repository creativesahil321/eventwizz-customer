"use client";

import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, Pin, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusBadge } from "./support-badges";
import CloseTicketDialog from "./close-ticket-dialog";
import TransferTicketDialog from "./transfer-ticket-dialog";
import type { AdminSupportConversation, SupportStatus } from "../_lib/types";
import {
  ADMIN_CATEGORY_LABELS,
  ADMIN_SOURCE_LABELS,
  formatOpenedAt,
  isClosedTicketStatus,
} from "../_lib/utils";
import { cn } from "@/lib/utils";

interface AdminConversationHeaderProps {
  conversation: AdminSupportConversation;
  status: SupportStatus;
  onStatusChange: (status: SupportStatus) => void;
  isPinned: boolean;
  onTogglePin: () => void;
}

export default function AdminConversationHeader({
  conversation,
  status,
  onStatusChange,
  isPinned,
  onTogglePin,
}: AdminConversationHeaderProps) {
  const [closeOpen, setCloseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const isClosed = isClosedTicketStatus(status);
  const canSendToVendor =
    !isClosed &&
    conversation.source === "customer" &&
    conversation.category === "general_support";

  const handleReopen = () => {
    onStatusChange("reopen");
    toast.success(`${conversation.ref} reopened`);
  };

  const handleClosed = () => {
    onStatusChange("closed");
  };

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
        <p className="break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          {conversation.ref}
          {conversation.bookingRef
            ? ` · Booking ${conversation.bookingRef}`
            : ""}{" "}
          · {conversation.venue.name} · Opened{" "}
          {formatOpenedAt(conversation.openedAt)}
        </p>

        <div className="mt-3 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <StatusBadge status={status} />
              <PriorityBadge priority={conversation.priority} />
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {ADMIN_CATEGORY_LABELS[conversation.category]}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {ADMIN_SOURCE_LABELS[conversation.source]}
              </span>
            </div>
            <h2 className="mt-2 break-words text-base font-semibold leading-snug text-foreground sm:text-lg">
              {conversation.subject}
            </h2>
          </div>

          <div
            className={cn(
              "grid w-full gap-2 sm:flex sm:w-auto sm:items-center",
              canSendToVendor ? "grid-cols-[auto_1fr_1fr]" : "grid-cols-[auto_1fr]"
            )}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "size-9 rounded-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
                isPinned &&
                  "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              )}
              aria-label={isPinned ? "Unpin conversation" : "Pin conversation"}
              onClick={onTogglePin}
            >
              <Pin className={cn("size-4", isPinned && "fill-current")} />
            </Button>
            {canSendToVendor ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-0 rounded-full border-slate-300 bg-white px-2 text-slate-900 hover:bg-slate-50 sm:px-3"
                onClick={() => setTransferOpen(true)}
              >
                <ArrowLeftRight className="size-4 shrink-0" />
                <span className="truncate">Send to vendor</span>
              </Button>
            ) : null}
            {isClosed ? (
              <Button
                type="button"
                variant="event-primary"
                size="sm"
                className="min-w-0 rounded-full px-2 sm:px-3"
                onClick={handleReopen}
              >
                <RotateCcw className="size-4 shrink-0" />
                <span className="truncate">Reopen</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="event-primary"
                size="sm"
                className="min-w-0 rounded-full px-2 sm:px-3"
                onClick={() => setCloseOpen(true)}
              >
                <CheckCircle2 className="size-4 shrink-0" />
                <span className="truncate">Close ticket</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <CloseTicketDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        ticketRef={conversation.ref}
        source={conversation.source}
        onClosed={handleClosed}
      />
      {canSendToVendor ? (
        <TransferTicketDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          ticketRef={conversation.ref}
          venueName={conversation.venue.name}
        />
      ) : null}
    </>
  );
}
