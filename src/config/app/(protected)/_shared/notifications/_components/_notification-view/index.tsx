// app/(protected)/vendor/notifications/_components/_notification-view/index.tsx
"use client";

import { Notification } from "../../_lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toSentenceCase } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Clock, User, Tag } from "lucide-react";

interface NotificationViewDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  notification: Notification | null;
}

export default function NotificationViewDialog({
  notification,
  ...props
}: NotificationViewDialogProps) {
  if (!notification) return null;

  const { timestamp, role, read, priority, payload } = notification;
  const { user, category, notification: message, date } = payload;

  return (
    <section className="w-full">
      <Dialog {...props}>
        <DialogContent className="sm:max-w-[600px] p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold text-gray-900">
              Notification Details
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Review the details of this notification below.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            {/* User Section */}
            <div className="flex items-center gap-4 rounded-lg border p-4 bg-background transition-shadow hover:shadow-sm">
              <Avatar className="h-12 w-12">
                {user.avatar ? (
                  <AvatarImage
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                  />
                ) : (
                  <AvatarFallback>
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-gray-500">@{user.username}</p>
              </div>
            </div>

            {/* Notification Details */}
            <div className="grid gap-4 rounded-lg border p-4 bg-background">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Category
                  </span>
                  <p className="text-gray-900">{toSentenceCase(category)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 flex items-center justify-center">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      priority === "high"
                        ? "bg-red-500"
                        : priority === "medium"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                  />
                </span>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Priority
                  </span>
                  <Badge
                    variant="outline"
                    className={`capitalize ${
                      priority === "high"
                        ? "border-red-500 text-red-500"
                        : priority === "medium"
                        ? "border-yellow-500 text-yellow-500"
                        : "border-green-500 text-green-500"
                    }`}
                  >
                    {priority}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Role
                  </span>
                  <p className="text-gray-900 capitalize">{role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Status
                  </span>
                  <Badge variant={read ? "default" : "secondary"}>
                    {read ? "Read" : "Unread"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Message and Timestamps */}
            <div className="space-y-4 rounded-lg border p-4 bg-background">
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Message
                </span>
                <p className="text-gray-900">{message}</p>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Date
                  </span>
                  <p className="text-gray-900">
                    {format(new Date(date), "MMMM dd, yyyy, HH:mm:ss")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(date), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Received
                  </span>
                  <p className="text-gray-900">
                    {format(new Date(timestamp), "MMMM dd, yyyy, HH:mm:ss")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            {!read && (
              <Button
                variant="event-primary"
                onClick={() => {
                  // Mark as read functionality would go here
                  props.onOpenChange?.(false);
                }}
              >
                Mark as Read
              </Button>
            )}
            <Button
              variant="event-outline"
              onClick={() => props.onOpenChange?.(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
