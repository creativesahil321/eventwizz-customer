"use client";

import { useState } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveNotificationPresentation } from "../_lib/notification-ui";
import { useRouter } from "next/navigation";

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

  // Format dates
  const formattedDate = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
  });
  const fullDate = format(new Date(created_at), "PPP p"); // Example: "Apr 29, 2023, 3:30 PM"

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

    onClose();

    if (normalizedUrl.startsWith("/")) {
      router.push(normalizedUrl);
      return;
    }

    window.open(normalizedUrl, "_self");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-black">
            <NotificationIcon className="h-5 w-5 text-[var(--color-primary)]" />
            <span>Notification Details</span>
          </DialogTitle>
          <DialogDescription className="text-black">
            View detailed information about this notification.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6 text-black">
          {/* Notification summary */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback>
                <NotificationIcon className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            <div>
              <h3 className="text-lg font-medium text-black">
                {title || "Notification"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
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
            <p className="text-base">
              {notice || "No additional details provided."}
            </p>
          </div>

          {/* Link */}
          {hasActionLink && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Action</h4>
              <div className="border rounded-md p-3">
                <Button
                  type="button"
                  variant="event-outline"
                  size="sm"
                  onClick={handleOpenNotificationLink}
                >
                  {notification.action_label?.trim() || "Open Notification"}
                </Button>
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
                "text-black",
              )}
            >
              {status === "read" ? "Read" : "Unread"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {status === "read" ? (
              <Button
                variant="event-outline"
                disabled={isUpdating}
                onClick={() => {
                  setIsUpdating(true);
                  onMarkAsUnread(id, { onSettled: () => setIsUpdating(false) });
                }}
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
                disabled={isUpdating}
                onClick={() => {
                  setIsUpdating(true);
                  onMarkAsRead(id, { onSettled: () => setIsUpdating(false) });
                }}
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

            <Button variant="event-outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
