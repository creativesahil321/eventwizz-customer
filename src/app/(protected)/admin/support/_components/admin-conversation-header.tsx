"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Pin,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  BookingBadge,
  PriorityBadge,
  SourceBadge,
  StatusBadge,
  VenueBadge,
} from "./support-badges";
import CloseTicketDialog from "./close-ticket-dialog";
import TransferTicketDialog from "./transfer-ticket-dialog";
import type {
  AdminSupportConversation,
  SupportAssignee,
  SupportStatus,
} from "../_lib/types";
import {
  ADMIN_CATEGORY_LABELS,
  formatOpenedAt,
  isClosedTicketStatus,
} from "../_lib/utils";
import { cn } from "@/lib/utils";

interface AdminConversationHeaderProps {
  conversation: AdminSupportConversation;
  status: SupportStatus;
  onStatusChange: (status: SupportStatus) => void;
  assignee: SupportAssignee | null;
  isPinned: boolean;
  onTogglePin: () => void;
  onAssignClick: () => void;
  canPin?: boolean;
  canManage?: boolean;
}

export default function AdminConversationHeader({
  conversation,
  status,
  onStatusChange,
  assignee,
  isPinned,
  onTogglePin,
  onAssignClick,
  canPin = false,
  canManage = false,
}: AdminConversationHeaderProps) {
  const [closeOpen, setCloseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const isClosed = isClosedTicketStatus(status);
  const canSendToVendor =
    canManage &&
    !isClosed &&
    conversation.source === "customer" &&
    conversation.category === "general_support";
  const canAssign = canManage && !isClosed;
  const canClose = canManage;

  const handleReopen = () => {
    onStatusChange("reopen");
    toast.success(`${conversation.ref} reopened`);
  };

  const handleClosed = (nextStatus: SupportStatus) => {
    onStatusChange(nextStatus);
  };

  return (
    <>
      <div className="min-w-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-5 sm:py-4">
        <p className="truncate text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          {conversation.ref} · Opened {formatOpenedAt(conversation.openedAt)}
        </p>

        <div className="mt-3 flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <SourceBadge source={conversation.source} />
              <VenueBadge name={conversation.venue.name} />
              {conversation.bookingRef ? (
                <BookingBadge bookingRef={conversation.bookingRef} />
              ) : null}
              <StatusBadge status={status} label={conversation.statusLabel} />
              <PriorityBadge priority={conversation.priority} />
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                {ADMIN_CATEGORY_LABELS[conversation.category]}
              </span>
              {assignee ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                  {assignee.name.split(" ")[0]}
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 max-w-full text-base font-semibold leading-snug break-words [overflow-wrap:anywhere] text-foreground sm:text-lg">
              {conversation.subject}
            </h2>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {canPin ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "size-9 shrink-0 rounded-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
                  isPinned &&
                    "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                )}
                aria-label={isPinned ? "Unpin conversation" : "Pin conversation"}
                onClick={onTogglePin}
              >
                <Pin className={cn("size-4", isPinned && "fill-current")} />
              </Button>
            ) : null}
            {canAssign ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-full border-slate-300 bg-white px-2.5 text-slate-900 hover:bg-slate-50 sm:px-3"
                onClick={onAssignClick}
                disabled={isClosed}
              >
                <UserPlus className="size-4 shrink-0" />
                <span className="truncate">
                  {assignee ? "Reassign" : "Assign"}
                </span>
              </Button>
            ) : null}
            {canSendToVendor ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-full border-slate-300 bg-white px-2.5 text-slate-900 hover:bg-slate-50 sm:px-3"
                onClick={() => setTransferOpen(true)}
              >
                <ArrowLeftRight className="size-4 shrink-0" />
                <span className="truncate">Send to vendor</span>
              </Button>
            ) : null}
            {canClose ? (
              isClosed ? (
                <Button
                  type="button"
                  variant="event-primary"
                  size="sm"
                  className="shrink-0 rounded-full px-2.5 sm:px-3"
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
                  className="shrink-0 rounded-full px-2.5 sm:px-3"
                  onClick={() => setCloseOpen(true)}
                >
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span className="truncate">Close ticket</span>
                </Button>
              )
            ) : null}
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
