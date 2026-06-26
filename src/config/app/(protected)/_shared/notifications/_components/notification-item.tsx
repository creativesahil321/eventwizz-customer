"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Notification } from "@/services/common/notification/type";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { resolveNotificationPresentation } from "../_lib/notification-ui";
import { useRouter } from "next/navigation";

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
  onMarkAsUnread,
  isUpdating = false,
}: NotificationItemProps) {
  const { id, title, notice, is_read, created_at, action_url, action_target } =
    notification;
  const notificationUi = resolveNotificationPresentation(notification);
  const NotificationIcon = notificationUi.icon;
  const router = useRouter();

  // Format the date (e.g., "2 days ago")
  const formattedDate = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
  });

  // API returns 0 for unread, 1 for read
  const status = is_read === 1 ? "read" : "unread";

  const hasActionLink = Boolean(action_url && action_url.trim().length > 0);

  const handleOpenNotificationLink = () => {
    if (!hasActionLink) return;
    const normalizedUrl = action_url!.trim();

    if (action_target === "new_tab") {
      window.open(normalizedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (normalizedUrl.startsWith("/")) {
      router.push(normalizedUrl);
      return;
    }

    window.open(normalizedUrl, "_self");
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-accent/5 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* User avatar */}
        <Avatar className="h-10 w-10">
          <AvatarFallback>
            <NotificationIcon className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        {/* Notification content */}
        <button
          type="button"
          className="flex-1 min-w-0 text-left disabled:cursor-default"
          disabled={!hasActionLink}
          onClick={handleOpenNotificationLink}
          title={hasActionLink ? "Open notification" : undefined}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{title || "Notification"}</span>
            <Badge
              variant="outline"
              className="text-xs capitalize inline-flex items-center gap-1 bg-transparent"
              style={{
                color: notificationUi.color,
                borderColor: notificationUi.color,
                backgroundColor: "transparent",
              }}
            >
              <NotificationIcon className="h-3 w-3" />
              {notificationUi.categoryLabel}
            </Badge>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formattedDate}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {notice || "No additional details provided."}
          </p>
        </button>
      </div>

      {/* Status and actions */}
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        <Badge
          variant={status === "read" ? "outline" : "default"}
          className={status === "read" ? "text-black bg-muted/30" : "primary"}
        >
          {status === "read" ? "Read" : "Unread"}
        </Badge>

        <div className="flex items-center gap-2">
          <Button
            variant="event-outline"
            size="sm"
            onClick={() => onViewDetails(notification)}
          >
            View Details
          </Button>

          {status === "read" ? (
            <Button
              variant="event-outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => onMarkAsUnread(id)}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Mark as Unread"
              )}
            </Button>
          ) : (
            <Button
              variant="event-primary"
              size="sm"
              disabled={isUpdating}
              onClick={() => onMarkAsRead(id)}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Mark as Read"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
