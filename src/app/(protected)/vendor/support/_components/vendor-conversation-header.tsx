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
import { PriorityBadge, StatusBadge } from "./support-badges";
import CloseTicketDialog from "./close-ticket-dialog";
import TransferTicketDialog from "./transfer-ticket-dialog";
import type {
  SupportAssignee,
  SupportStatus,
  VendorSupportConversation,
} from "../_lib/types";
import {
  formatOpenedAt,
  isClosedTicketStatus,
  VENDOR_CATEGORY_LABELS,
  VENDOR_DIRECTION_LABELS,
} from "../_lib/utils";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

/** Account owner — staff use custom roles (e.g. ticket-managers). */
function isMainVendorRole(role: string | null | undefined): boolean {
  const normalized = (role ?? "").trim().toLowerCase();
  return (
    normalized === "vendor" ||
    normalized === "owner" ||
    normalized === "event admin" ||
    normalized === "event_admin"
  );
}

interface VendorConversationHeaderProps {
  conversation: VendorSupportConversation;
  status: SupportStatus;
  onStatusChange: (status: SupportStatus) => void;
  assignee: SupportAssignee | null;
  isPinned: boolean;
  onTogglePin: () => void;
  onAssignClick: () => void;
  onEscalated?: (result: { status: SupportStatus; canReply: boolean }) => void;
  canPin?: boolean;
  canManage?: boolean;
}

export default function VendorConversationHeader({
  conversation,
  status,
  onStatusChange,
  assignee,
  isPinned,
  onTogglePin,
  onAssignClick,
  onEscalated,
  canPin: canPinProp,
  canManage = false,
}: VendorConversationHeaderProps) {
  const [closeOpen, setCloseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const activeRole = useAuthStore((s) => s.active_role);

  const isClosed = isClosedTicketStatus(status);
  const isSentToAdmin = conversation.direction === "sent";
  // Assign / Transfer / Close visibility from can_manage (API).
  const canTransfer = canManage && !isSentToAdmin;
  const canAssign = canManage && !isSentToAdmin;
  const canPin = canPinProp ?? false;
  // Admin-queue tickets: close is main-vendor only.
  const canClose =
    canManage && (!isSentToAdmin || isMainVendorRole(activeRole));

  const handleReopen = () => {
    onStatusChange("reopen");
    toast.success(`${conversation.ref} reopened`);
  };

  const handleClosed = () => {
    onStatusChange("closed");
  };

  /** Vendors cannot reopen customer-raised tickets; only the customer can. */
  const canReopen = isClosed && isSentToAdmin;

  return (
    <>
      <div className="min-w-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-5 sm:py-4">
        <p className="truncate text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          {conversation.ref}
          {conversation.bookingRef
            ? ` · Booking ${conversation.bookingRef}`
            : ""}{" "}
          · Opened {formatOpenedAt(conversation.openedAt)}
        </p>

        <div className="mt-3 flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  isSentToAdmin
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-emerald-50 text-emerald-700"
                )}
              >
                {VENDOR_DIRECTION_LABELS[conversation.direction]}
              </span>
              <StatusBadge
                status={status}
                label={conversation.statusLabel}
              />
              <PriorityBadge priority={conversation.priority} />
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {VENDOR_CATEGORY_LABELS[conversation.category]}
              </span>
              {canAssign && assignee ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {assignee.name.split(" ")[0]}
                </span>
              ) : null}
              {isSentToAdmin ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  All staff
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
              >
                <UserPlus className="size-4 shrink-0" />
                <span className="truncate">
                  {assignee ? "Reassign" : "Assign"}
                </span>
              </Button>
            ) : null}
            {canTransfer ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-full border-slate-300 bg-white px-2.5 text-slate-900 hover:bg-slate-50 sm:px-3"
                onClick={() => setTransferOpen(true)}
              >
                <ArrowLeftRight className="size-4 shrink-0" />
                <span className="truncate">Transfer</span>
              </Button>
            ) : null}
            {canClose ? (
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
            ) : canReopen ? (
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
            ) : null}
          </div>
        </div>
      </div>

      {canClose ? (
        <CloseTicketDialog
          open={closeOpen}
          onOpenChange={setCloseOpen}
          ticketRef={conversation.ref}
          onClosed={handleClosed}
        />
      ) : null}
      {canTransfer ? (
        <TransferTicketDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          ticketRef={conversation.ref}
          onEscalated={(result) => {
            onStatusChange(result.status);
            onEscalated?.(result);
          }}
        />
      ) : null}
    </>
  );
}
