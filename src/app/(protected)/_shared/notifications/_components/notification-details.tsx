"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Notification } from "@/services/common/notification/type";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_CONFIG } from "../_lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Clock, User } from "lucide-react";
import { env } from "@/env";
import { cn } from "@/lib/utils";

interface NotificationDetailsProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
  onMarkAsUnread: (id: number) => void;
}

export function NotificationDetailsComponent({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAsUnread,
}: NotificationDetailsProps) {
  if (!notification) return null;

  const { id, user, icon, title, notice, is_read, created_at, action_url } =
    notification;

  // Extract category from icon if available - handle both URL and class name formats
  const iconParts = icon ? icon.split("/").pop()?.split(" ") : [];
  const category = iconParts?.length
    ? iconParts[iconParts.length - 1] || "check"
    : "system";

  // Get the category config or fallback to system
  const categoryConfig =
    CATEGORY_CONFIG[category?.toLowerCase()] || CATEGORY_CONFIG.system;

  // Format dates
  const formattedDate = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
  });
  const fullDate = format(new Date(created_at), "PPP p"); // Example: "Apr 29, 2023, 3:30 PM"

  // API returns 0 for unread, 1 for read
  const status = is_read === 1 ? "read" : "unread";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-black">
            <Bell className="h-5 w-5 text-[var(--color-primary)]" />
            <span>Notification Details</span>
          </DialogTitle>
          <DialogDescription className="text-black">
            View detailed information about this notification.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6 text-black">
          {/* User information */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage
                src={
                  user.avatar
                    ? `${env.NEXT_PUBLIC_API_URL}/storage/${user.avatar}`
                    : undefined
                }
                alt={user.full_name}
              />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            <div>
              <h3 className="text-lg font-medium text-black">
                {user.full_name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
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
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span title={fullDate}>{formattedDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          {title && (
            <div className="bg-accent/5 p-4 rounded-md">
              <h4 className="font-medium text-base text-black">{title}</h4>
            </div>
          )}

          {/* Message */}
          <div className="bg-accent/10 p-4 rounded-md">
            <p className="text-base">{notice}</p>
          </div>

          {/* Link */}
          {action_url && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Link</h4>
              <div className="border rounded-md p-3">
                <a
                  href={action_url}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {action_url}
                </a>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant={status === "read" ? "outline" : "default"}
              className={cn(
                status === "read" ? "bg-muted/30" : "bg-[var(--color-primary)]",
                "text-black"
              )}
            >
              {status === "read" ? "Read" : "Unread"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {status === "read" ? (
              <Button
                variant="event-outline"
                onClick={() => onMarkAsUnread(id)}
              >
                Mark as Unread
              </Button>
            ) : (
              <Button variant="event-outline" onClick={() => onMarkAsRead(id)}>
                Mark as Read
              </Button>
            )}

            <Button variant="destructive" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
