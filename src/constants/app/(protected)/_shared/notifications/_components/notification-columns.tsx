"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Notification, DataTableRowAction } from "../_lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toSentenceCase } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

async function markNotificationAsRead(id: string) {
  console.log(`Marking notification ${id} as read`);
}

export function getNotificationColumns({
  setRowAction,
}: {
  setRowAction: (action: DataTableRowAction<Notification> | null) => void;
}): ColumnDef<Notification>[] {
  return [
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const { user } = row.original.payload;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user.avatar}
                alt={`${user.firstName} ${user.lastName}`}
              />
              <AvatarFallback>
                {user.firstName[0]}
                {user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">
              {user.firstName} {user.lastName}
            </span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "timestamp",
      header: "Date & Time",
      cell: ({ row }) => {
        const date = new Date(row.original.timestamp);
        const formattedDate = format(date, "MMMM dd, yyyy, HH:mm:ss");
        const timeAgo = formatDistanceToNow(date, { addSuffix: true });
        return (
          <div className="flex flex-col">
            <span className="text-sm md:text-base">{formattedDate}</span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.timestamp).getTime();
        const dateB = new Date(rowB.original.timestamp).getTime();
        return dateA - dateB;
      },
      enableSorting: false,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="truncate">
          {toSentenceCase(row.original.payload.category)}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        rowA.original.payload.category.localeCompare(
          rowB.original.payload.category
        ),
      enableSorting: false,
    },

    {
      accessorKey: "message",
      header: "Message",
      cell: ({ row }) => (
        <span className="truncate max-w-[200px] md:max-w-[300px] block">
          {row.original.payload.notification}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "read",
      header: "Status",
      cell: ({ row }) => (
        <span className="truncate">
          {row.original.read ? "Read" : "Unread"}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2 flex-wrap">
          {!row.original.read && (
            <Button
              variant="event-primary"
              size="sm"
              onClick={() => markNotificationAsRead(row.original.id)}
              className="whitespace-nowrap"
            >
              Mark as Read
            </Button>
          )}
          <Button
            variant="event-outline"
            size="sm"
            onClick={() =>
              setRowAction({
                type: "view-details",
                row: { original: row.original },
              })
            }
            className="whitespace-nowrap"
          >
            View Details
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];
}
