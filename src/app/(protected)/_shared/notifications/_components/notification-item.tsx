"use client";

import { Notification } from "@/services/common/notification/type";
import {
  formatShortRelativeTime,
  resolveNotificationPresentation,
} from "../_lib/notification-ui";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onViewDetails: (notification: Notification) => void;
  onMarkAsRead: (id: number) => void;
  onMarkAsUnread: (id: number) => void;
  isUpdating?: boolean;
}

export function NotificationItemComponent({
  notification,
  onViewDetails,
  onMarkAsRead,
}: NotificationItemProps) {
  const { id, title, notice, is_read, created_at } = notification;
  const notificationUi = resolveNotificationPresentation(notification);
  const NotificationIcon = notificationUi.icon;

  const isUnread = is_read !== 1;
  const formattedDate = formatShortRelativeTime(created_at);

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(id);
    }
    onViewDetails(notification);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left transition-all",
        "hover:border-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30",
        isUnread
          ? "border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))]"
          : "border-[var(--color-border)]",
      )}
    >
      {isUnread ? (
        <span
          aria-hidden
          className="absolute inset-y-3 left-0 w-1 rounded-full bg-[var(--color-primary)]"
        />
      ) : null}

      <span
        className={cn(
          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
          notificationUi.tone.bg,
          notificationUi.tone.fg,
        )}
      >
        <NotificationIcon className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-foreground">
              {title || "Notification"}
            </span>
            <span className="inline-flex items-center rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {notificationUi.categoryLabel}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
            {isUnread ? (
              <span
                aria-label="Unread"
                className="size-2 rounded-full bg-[var(--color-primary)]"
              />
            ) : null}
          </div>
        </div>

        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
          {notice || "No additional details provided."}
        </p>
      </div>
    </button>
  );
}
