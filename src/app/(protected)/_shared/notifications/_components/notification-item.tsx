"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Notification } from "@/services/common/notification/type";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { CATEGORY_CONFIG } from "../_lib/constants";
import { User } from "lucide-react";
import { env } from "@/env";

interface NotificationItemProps {
  notification: Notification;
  onViewDetails: (notification: Notification) => void;
  onMarkAsRead: (id: number) => void;
  onMarkAsUnread: (id: number) => void;
}

export function NotificationItemComponent({
  notification,
  onViewDetails,
  onMarkAsRead,
  onMarkAsUnread,
}: NotificationItemProps) {
  const { id, user, title, notice, icon, is_read, created_at } = notification;

  // Extract category from icon if available - handle both URL and class name formats
  const iconParts = icon ? icon.split("/").pop()?.split(" ") : [];
  const category = iconParts?.length
    ? iconParts[iconParts.length - 1] || "check"
    : "system";

  // Get the category config or fallback to system
  const categoryConfig =
    CATEGORY_CONFIG[category?.toLowerCase()] || CATEGORY_CONFIG.system;

  // Format the date (e.g., "2 days ago")
  const formattedDate = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
  });

  // API returns 0 for unread, 1 for read
  const status = is_read === 1 ? "read" : "unread";

  return (
    <div className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-accent/5 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* User avatar */}
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={
              user.avatar
                ? `${env.NEXT_PUBLIC_API_URL}/storage/${user.avatar}`
                : undefined
            }
            alt={user.full_name}
          />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        {/* Notification content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{user.full_name}</span>
            <Badge
              variant="primary"
              className="text-xs capitalize"
              style={{
                color: categoryConfig.color,
                borderColor: categoryConfig.color,
              }}
            >
              {category}
            </Badge>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formattedDate}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {notice || title}
          </p>
        </div>
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
              onClick={() => onMarkAsUnread(id)}
            >
              Mark as Unread
            </Button>
          ) : (
            <Button
              variant="event-primary"
              size="sm"
              onClick={() => onMarkAsRead(id)}
            >
              Mark as Read
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
