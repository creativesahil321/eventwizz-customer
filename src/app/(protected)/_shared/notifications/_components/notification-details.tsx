"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Notification } from "@/services/common/notification/type";
import { format } from "date-fns";
import {
  formatShortRelativeTime,
  resolveNotificationPresentation,
} from "../_lib/notification-ui";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationDetailsProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: number, options?: { onSettled?: () => void }) => void;
  onMarkAsUnread: (id: number, options?: { onSettled?: () => void }) => void;
}

export function NotificationDetailsComponent({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAsUnread,
}: NotificationDetailsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  if (!notification) return null;

  const { id, title, notice, is_read, created_at, action_url, action_target } =
    notification;
  const notificationUi = resolveNotificationPresentation(notification);
  const NotificationIcon = notificationUi.icon;

  const relativeTime = formatShortRelativeTime(created_at);
  const fullDate = format(new Date(created_at), "PPP p");
  const isUnread = is_read !== 1;
  const hasActionLink = Boolean(action_url && action_url.trim().length > 0);

  const handleOpenNotificationLink = () => {
    if (!hasActionLink) return;
    const normalizedUrl = action_url!.trim();

    if (isUnread) {
      onMarkAsRead(id);
    }

    if (action_target === "new_tab") {
      window.open(normalizedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    onClose();

    if (normalizedUrl.startsWith("/")) {
      router.push(normalizedUrl);
      return;
    }

    window.open(normalizedUrl, "_self");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border-[var(--color-border)] p-0 sm:max-w-[520px]">
        <div className="flex items-start gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              notificationUi.tone.bg,
              notificationUi.tone.fg,
            )}
          >
            <NotificationIcon className="size-5" />
          </span>

          <div className="min-w-0 flex-1 pr-6">
            <DialogTitle className="text-lg font-semibold leading-snug text-foreground">
              {title || "Notification"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              <span title={fullDate}>
                {notificationUi.categoryLabel}
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                {relativeTime}
              </span>
            </DialogDescription>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <p className="text-sm leading-relaxed text-foreground">
              {notice || "No additional details provided."}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-[var(--color-border)] bg-muted/20 px-5 py-3 sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="event-outline" size="sm" onClick={onClose}>
              <X className="size-4" />
              Close
            </Button>

            {isUnread ? (
              <Button
                variant="event-outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => {
                  setIsUpdating(true);
                  onMarkAsRead(id, { onSettled: () => setIsUpdating(false) });
                }}
              >
                {isUpdating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Mark as read
              </Button>
            ) : (
              <Button
                variant="event-outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => {
                  setIsUpdating(true);
                  onMarkAsUnread(id, {
                    onSettled: () => setIsUpdating(false),
                  });
                }}
              >
                {isUpdating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Mark as unread
              </Button>
            )}
          </div>

          {hasActionLink ? (
            <Button
              variant="event-primary"
              size="sm"
              onClick={handleOpenNotificationLink}
            >
              {notification.action_label?.trim() || "Open"}
              <ChevronRight className="size-4" />
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
